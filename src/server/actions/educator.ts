"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { DocumentType } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { DOCUMENT_TYPES, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { activeClasses, activeSubjects, cycleOfClass } from "@/lib/curriculum";
import { formatDate, fullName } from "@/lib/format";
import { DOSSIER_STEPS, dossierProgress } from "@/lib/educator-dossier";
import { type ActionState, dossierStepSchemas, fieldErrors, lessonSchema } from "@/lib/validation";
import { deleteStoredFile, storeUpload } from "@/server/services/storage";
import { notify, notifyAdmins } from "@/server/services/notify";
import { slotLabel } from "@/server/services/tutoring";
import { getCurriculum } from "@/server/queries/curriculum";

async function currentProfile(userId: string) {
  return db.educatorProfile.upsert({ where: { userId }, create: { userId }, update: {} });
}

// Enregistre une étape du dossier puis passe à la suivante.
export async function saveDossierStepAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("EDUCATOR");
  const profile = await currentProfile(user.id);
  const index = DOSSIER_STEPS.findIndex((s) => s.key === formData.get("step"));
  const step = DOSSIER_STEPS[index]?.key;
  // Un dossier refusé repasse « à compléter » dès qu'il est corrigé.
  const status = profile.status === "REJECTED" ? "INCOMPLETE" : profile.status;
  const values = Object.fromEntries(formData);

  if (step === "profil") {
    const parsed = dossierStepSchemas.profil.safeParse(values);
    if (!parsed.success) return fieldErrors(parsed.error);
    await db.educatorProfile.update({ where: { id: profile.id }, data: { ...parsed.data, bio: parsed.data.bio ?? null, status } });
  } else if (step === "parcours") {
    const parsed = dossierStepSchemas.parcours.safeParse(values);
    if (!parsed.success) {
      // « Expérience 2 : le poste est obligatoire » plutôt qu'un message sans repère.
      const result = fieldErrors(parsed.error);
      const rows = parsed.error.issues
        .filter((i) => i.path[0] === "experiences" && typeof i.path[1] === "number")
        .map((i) => `Expérience ${Number(i.path[1]) + 1} : ${i.message}`);
      if (rows.length > 0) result.errors = { ...result.errors, experiences: rows };
      return result;
    }
    const d = parsed.data;
    await db.educatorProfile.update({
      where: { id: profile.id },
      data: {
        ...d,
        degreeSchool: d.degreeSchool ?? null,
        degreeYear: d.degreeYear ?? null,
        occupationPlace: d.occupationPlace ?? null,
        achievements: d.achievements ?? null,
        status,
      },
    });
  } else if (step === "cours") {
    const availabilities = formData
      .getAll("availabilities")
      .filter((v): v is string => typeof v === "string")
      .map((v) => {
        const [day, slot] = v.split("|");
        return { day, slot };
      });
    const parsed = dossierStepSchemas.cours.safeParse({ cycles: formData.getAll("cycles"), subjects: formData.getAll("subjects"), classLevels: formData.getAll("classLevels"), availabilities });
    if (!parsed.success) return fieldErrors(parsed.error);
    const { availabilities: slots, ...data } = parsed.data;

    // Seules les classes et matières actives du référentiel peuvent être choisies.
    const curriculum = await getCurriculum();
    const classes = activeClasses(curriculum);
    const subjects = activeSubjects(curriculum).map((s) => s.key);
    if (data.classLevels.some((c) => !classes.includes(c))) return { ok: false, errors: { classLevels: ["Classe invalide."] } };
    // Chaque cycle coché doit compter au moins une classe, et chaque classe relever d'un cycle coché.
    if (data.classLevels.some((c) => !(data.cycles as string[]).includes(cycleOfClass(curriculum, c) ?? ""))) {
      return { ok: false, errors: { classLevels: ["Une classe choisie ne fait pas partie des cycles cochés."] } };
    }
    const empty = data.cycles.filter((cycle) => !data.classLevels.some((c) => cycleOfClass(curriculum, c) === cycle));
    if (empty.length > 0) return { ok: false, errors: { classLevels: [`Choisissez au moins une classe en ${empty.join(", ")}, ou décochez ce cycle.`] } };
    if (data.subjects.some((s) => !subjects.includes(s))) return { ok: false, errors: { subjects: ["Matière invalide."] } };

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
      db.educatorProfile.update({ where: { id: profile.id }, data: { ...data, status } }),
      db.availability.deleteMany({ where: { educatorId: profile.id } }),
      db.availability.createMany({ data: slots.map((s) => ({ ...s, educatorId: profile.id })) }),
    ]);
  } else if (step === "garants") {
    const parsed = dossierStepSchemas.garants.safeParse(values);
    if (!parsed.success) return fieldErrors(parsed.error);
    await db.educatorProfile.update({ where: { id: profile.id }, data: { ...parsed.data, status } });
  } else {
    return { ok: false, message: "Étape inconnue." };
  }

  await audit(user.id, "educator.profile_saved", "EducatorProfile", profile.id, { step });
  revalidatePath("/educateur");
  redirect(`/educateur/dossier?etape=${DOSSIER_STEPS[index + 1].key}`);
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
  const progress = dossierProgress({ ...profile, availabilityCount: profile._count.availabilities, documentTypes: profile.documents.map((d) => d.type) });
  const missing: string[] = DOSSIER_STEPS.filter((s) => s.key !== "pieces" && !progress[s.key]).map((s) => `étape « ${s.label} »`);
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
