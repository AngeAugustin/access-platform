"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { DocumentType } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { DOCUMENT_TYPES, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { type ActionState, educatorProfileSchema, fieldErrors, lessonSchema } from "@/lib/validation";
import { deleteStoredFile, storeUpload } from "@/server/services/storage";
import { notify, notifyAdmins } from "@/server/services/notify";
import { slotLabel } from "@/server/services/tutoring";

async function currentProfile(userId: string) {
  return db.educatorProfile.upsert({ where: { userId }, create: { userId }, update: {} });
}

export async function saveEducatorProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("EDUCATOR");
  const profile = await currentProfile(user.id);
  const availabilities = formData
    .getAll("availabilities")
    .filter((v): v is string => typeof v === "string")
    .map((v) => {
      const [day, slot] = v.split("|");
      return { day, slot };
    });
  const parsed = educatorProfileSchema.safeParse({
    ...Object.fromEntries(formData),
    subjects: formData.getAll("subjects"),
    classLevels: formData.getAll("classLevels"),
    availabilities,
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { availabilities: slots, ...data } = parsed.data;

  // Un créneau réservé par une famille ne peut pas être retiré tant que le tutorat est en cours.
  const booked = await db.bookedSlot.findMany({ where: { educatorId: profile.id } });
  const removedBooked = booked.filter((b) => !slots.some((s) => s.day === b.day && s.slot === b.slot));
  if (removedBooked.length > 0) {
    return {
      ok: false,
      errors: { availabilities: [`${removedBooked.map((b) => slotLabel(b.day, b.slot)).join(", ")} : créneau(x) réservé(s), impossible de le(s) retirer.`] },
    };
  }

  await db.$transaction([
    db.educatorProfile.update({
      where: { id: profile.id },
      data: { ...data, bio: data.bio ?? null, status: profile.status === "REJECTED" ? "INCOMPLETE" : profile.status },
    }),
    db.availability.deleteMany({ where: { educatorId: profile.id } }),
    db.availability.createMany({ data: slots.map((s) => ({ ...s, educatorId: profile.id })) }),
  ]);
  await audit(user.id, "educator.profile_saved", "EducatorProfile", profile.id);
  revalidatePath("/educateur");
  return { ok: true, message: "Dossier enregistré." };
}

export async function uploadDocumentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("EDUCATOR");
  if (!(await rateLimit(`upload:${user.id}`, 30, 3600))) return { ok: false, message: "Trop d'envois. Réessayez plus tard." };
  const type = formData.get("type");
  const file = formData.get("file");
  if (typeof type !== "string" || !(type in DOCUMENT_TYPES)) return { ok: false, message: "Type de document invalide." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez un fichier." };

  const profile = await currentProfile(user.id);
  if (profile.status === "VALIDATED" && type !== "PHOTO") {
    return { ok: false, message: "Votre dossier est validé : contactez Access pour remplacer une pièce justificative." };
  }
  const allowed = type === "PHOTO" ? ["image/jpeg", "image/png"] : ["application/pdf", "image/jpeg", "image/png"];
  let stored;
  try {
    stored = await storeUpload(file, allowed);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Fichier refusé." };
  }
  const previous = await db.educatorDocument.findUnique({
    where: { educatorId_type: { educatorId: profile.id, type: type as DocumentType } },
  });
  await db.educatorDocument.upsert({
    where: { educatorId_type: { educatorId: profile.id, type: type as DocumentType } },
    create: { educatorId: profile.id, type: type as DocumentType, originalName: file.name.slice(0, 200), ...stored },
    update: { originalName: file.name.slice(0, 200), uploadedAt: new Date(), ...stored },
  });
  if (previous) await deleteStoredFile(previous.storageKey);
  await audit(user.id, "educator.document_uploaded", "EducatorProfile", profile.id, { type });
  revalidatePath("/educateur/dossier");
  return { ok: true, message: `${DOCUMENT_TYPES[type as DocumentType]} enregistré(e).` };
}

export async function submitProfileAction(): Promise<ActionState> {
  const user = await requireRole("EDUCATOR");
  const profile = await db.educatorProfile.findUnique({
    where: { userId: user.id },
    include: { documents: { select: { type: true } }, _count: { select: { availabilities: true } } },
  });
  if (!profile) return { ok: false, message: "Complétez d'abord votre dossier." };
  if (profile.status === "SUBMITTED" || profile.status === "VALIDATED") return { ok: false, message: "Dossier déjà transmis." };
  const missing: string[] = [];
  if (!profile.background || !profile.birthDate || !profile.guarantor1Name || !profile.guarantor2Name || !profile.payoutPhone) {
    missing.push("informations du dossier");
  }
  if (profile.subjects.length === 0 || profile.classLevels.length === 0) missing.push("matières et classes");
  if (profile._count.availabilities === 0) missing.push("disponibilités");
  for (const t of REQUIRED_DOCUMENTS) if (!profile.documents.some((d) => d.type === t)) missing.push(DOCUMENT_TYPES[t].toLowerCase());
  if (missing.length > 0) return { ok: false, message: `Il manque : ${missing.join(", ")}.` };

  await db.educatorProfile.update({
    where: { id: profile.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null },
  });
  await audit(user.id, "educator.profile_submitted", "EducatorProfile", profile.id);
  await notifyAdmins({
    type: "educator.submitted",
    title: "Dossier à valider",
    body: `${user.firstName} ${user.lastName} a transmis son dossier.`,
    link: `/admin/educateurs/${profile.id}`,
    email: true,
  });
  revalidatePath("/educateur");
  return { ok: true, message: "Dossier transmis. Access vous prévient dès qu'il est vérifié." };
}

export async function addLessonAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("EDUCATOR");
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;
  const tutoring = await db.tutoring.findFirst({
    where: { id: d.tutoringId, educator: { userId: user.id } },
    include: { child: true },
  });
  if (!tutoring) return { ok: false, message: "Tutorat introuvable." };

  const start = new Date(tutoring.startDate.toISOString().slice(0, 10));
  const end = tutoring.stoppedAt ?? tutoring.endDate;
  if (d.date < start || d.date > end) {
    return { ok: false, errors: { date: [`La date doit être comprise entre le ${formatDate(start)} et le ${formatDate(end)}.`] } };
  }
  // Saisie tolérée 7 jours après la fin du tutorat, pour les séances oubliées.
  if (tutoring.status !== "ACTIVE" && Date.now() - end.getTime() > 7 * 864e5) {
    return { ok: false, message: "Ce tutorat est clôturé depuis plus de 7 jours." };
  }
  try {
    await db.lesson.create({
      data: { tutoringId: tutoring.id, date: d.date, slot: d.slot, workDone: d.workDone, observation: d.observation },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, message: "Cette séance est déjà enregistrée." };
    }
    throw err;
  }
  await notify({
    userId: tutoring.parentId,
    type: "lesson.recorded",
    title: "Nouvelle séance",
    body: `Séance du ${formatDate(d.date)} avec ${fullName(tutoring.child)} : ${d.workDone.slice(0, 120)}`,
    link: `/parent/tutorats/${tutoring.id}`,
  });
  revalidatePath(`/educateur/eleves/${tutoring.id}`);
  return { ok: true, message: "Séance enregistrée. Le parent est invité à la confirmer." };
}
