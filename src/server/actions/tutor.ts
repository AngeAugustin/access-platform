"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { DocumentType, Prisma } from "@/generated/prisma/client";
import { requireTutorSpace, type CurrentUser } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { DOCUMENT_TYPES, OCCURRENCE_RESULTS, TASK_KINDS, TUTOR_REQUIRED_DOCUMENTS } from "@/lib/constants";
import { localDate, occurrenceState } from "@/lib/follow-up";
import { type ActionState, fieldErrors, followUpReasonSchema, occurrenceReportSchema, tutorDossierSchema } from "@/lib/validation";
import { deleteStoredFile, readStoredFile, storeBuffer, storeUpload } from "@/server/services/storage";
import { notify, notifyAdmins } from "@/server/services/notify";
import { endFollowUp, ensureOccurrences } from "@/server/services/follow-up";

const MAX_PHOTOS = 3;

async function tutorProfileOf(user: CurrentUser) {
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id } });
  if (profile) return profile;
  // Un compte tuteur a toujours sa fiche ; un éducateur doit d'abord activer la sienne.
  if (user.role === "TUTOR") return db.tutorProfile.create({ data: { userId: user.id } });
  return null;
}

// Éducateur : ouvre l'espace tuteur en reprenant ce qui est déjà dans son dossier (zones, garant, Mobile Money, pièces).
export async function activateTutorProfileAction(): Promise<ActionState> {
  const user = await requireTutorSpace();
  if (user.role !== "EDUCATOR") return { ok: false, message: "Action réservée aux éducateurs." };
  if (await db.tutorProfile.findUnique({ where: { userId: user.id } })) redirect("/tuteur/dossier");
  const educator = await db.educatorProfile.findUnique({ where: { userId: user.id }, include: { documents: { where: { type: { in: [...TUTOR_REQUIRED_DOCUMENTS] } } } } });
  const profile = await db.tutorProfile.create({
    data: {
      userId: user.id,
      birthDate: educator?.birthDate,
      zone: educator?.zone,
      occupation: educator?.occupation,
      bio: educator?.bio,
      guarantorName: educator?.guarantor1Name,
      guarantorPhone: educator?.guarantor1Phone,
      payoutPhone: educator?.payoutPhone,
      payoutOperator: educator?.payoutOperator,
    },
  });
  // Les pièces sont copiées : chaque dossier garde ses propres fichiers.
  for (const doc of educator?.documents ?? []) {
    try {
      const stored = await storeBuffer(await readStoredFile(doc.storageKey), [doc.mimeType]);
      await db.tutorDocument.create({ data: { tutorId: profile.id, type: doc.type, originalName: doc.originalName, ...stored } });
    } catch (err) {
      console.error("[tuteur] copie de pièce", doc.id, err);
    }
  }
  await audit(user.id, "tutor.activated", "TutorProfile", profile.id);
  redirect("/tuteur/dossier");
}

export async function saveTutorDossierAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  const profile = await tutorProfileOf(user);
  if (!profile) return { ok: false, message: "Activez d'abord votre profil tuteur." };
  const parsed = tutorDossierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  // Un dossier refusé repasse « à compléter » dès qu'il est corrigé.
  const status = profile.status === "REJECTED" ? "INCOMPLETE" : profile.status;
  await db.tutorProfile.update({ where: { id: profile.id }, data: { ...parsed.data, bio: parsed.data.bio ?? null, status } });
  await audit(user.id, "tutor.profile_saved", "TutorProfile", profile.id);
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Profil enregistré." };
}

export async function uploadTutorDocumentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  if (!(await rateLimit(`upload:${user.id}`, 30, 3600))) return { ok: false, message: "Trop d'envois. Réessayez plus tard." };
  const profile = await tutorProfileOf(user);
  if (!profile) return { ok: false, message: "Activez d'abord votre profil tuteur." };
  const type = formData.get("type");
  const file = formData.get("file");
  if (typeof type !== "string" || !(TUTOR_REQUIRED_DOCUMENTS as readonly string[]).includes(type)) return { ok: false, message: "Type de document invalide." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choisissez un fichier." };
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
  const key = { tutorId_type: { tutorId: profile.id, type: type as DocumentType } };
  const previous = await db.tutorDocument.findUnique({ where: key });
  await db.tutorDocument.upsert({
    where: key,
    create: { tutorId: profile.id, type: type as DocumentType, originalName: file.name.slice(0, 200), ...stored },
    update: { originalName: file.name.slice(0, 200), uploadedAt: new Date(), ...stored },
  });
  if (previous) await deleteStoredFile(previous.storageKey);
  await audit(user.id, "tutor.document_uploaded", "TutorProfile", profile.id, { type });
  revalidatePath("/tuteur/dossier");
  return { ok: true, message: `${DOCUMENT_TYPES[type as DocumentType]} enregistré(e).` };
}

export async function submitTutorDossierAction(): Promise<ActionState> {
  const user = await requireTutorSpace();
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, include: { documents: { select: { type: true } } } });
  if (!profile) return { ok: false, message: "Complétez d'abord votre dossier." };
  if (profile.status === "SUBMITTED" || profile.status === "VALIDATED") return { ok: false, message: "Dossier déjà transmis." };
  const missing: string[] = [];
  if (!profile.zone || !profile.occupation || !profile.birthDate || !profile.guarantorName || !profile.payoutPhone) missing.push("votre profil");
  for (const t of TUTOR_REQUIRED_DOCUMENTS) if (!profile.documents.some((d) => d.type === t)) missing.push(DOCUMENT_TYPES[t].toLowerCase());
  if (missing.length > 0) return { ok: false, message: `Il manque : ${missing.join(", ")}.` };

  await db.tutorProfile.update({ where: { id: profile.id }, data: { status: "SUBMITTED", submittedAt: new Date(), rejectionReason: null } });
  await audit(user.id, "tutor.profile_submitted", "TutorProfile", profile.id);
  await notifyAdmins({
    type: "tutor.submitted",
    title: "Dossier tuteur à valider",
    body: `${user.firstName} ${user.lastName} a transmis son dossier de tuteur.`,
    link: `/admin/tuteurs/${profile.id}`,
    email: true,
  });
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Dossier transmis. Access vous prévient dès qu'il est vérifié." };
}

// Suivi du tuteur connecté, dans l'état attendu.
async function ownFollowUp(user: CurrentUser, followUpId: string, status: "REQUESTED" | "ACTIVE") {
  const followUp = await db.followUp.findFirst({
    where: { id: followUpId, tutor: { userId: user.id } },
    include: { tutor: { select: { status: true } }, children: { include: { child: { select: { firstName: true } } } } },
  });
  if (!followUp) return { error: "Suivi introuvable." } as const;
  if (followUp.status !== status) return { error: status === "REQUESTED" ? "Cette demande a déjà reçu une réponse." : "Ce suivi n'est plus actif." } as const;
  return { followUp } as const;
}

export async function acceptFollowUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  const found = await ownFollowUp(user, String(formData.get("followUpId") ?? ""), "REQUESTED");
  if ("error" in found) return { ok: false, message: found.error };
  const { followUp } = found;
  if (followUp.tutor.status !== "VALIDATED") return { ok: false, message: "Votre dossier doit être validé par Access avant d'accepter un suivi." };
  // Un début déjà passé (réponse tardive) est ramené à aujourd'hui.
  const today = localDate();
  await db.followUp.update({ where: { id: followUp.id }, data: { status: "ACTIVE", respondedAt: new Date(), startDate: followUp.startDate < today ? today : followUp.startDate } });
  await ensureOccurrences({ id: followUp.id });
  await audit(user.id, "followup.accept", "FollowUp", followUp.id);
  await notify({
    userId: followUp.parentId,
    type: "followup.accepted",
    title: "Suivi accepté",
    body: `${user.firstName} ${user.lastName} a accepté de suivre ${followUp.children.map((c) => c.child.firstName).join(" et ")}.`,
    link: `/parent/suivi/${followUp.id}`,
    email: true,
  });
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Suivi accepté. Les premières actions apparaissent dans « Aujourd'hui »." };
}

export async function declineFollowUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  const parsed = followUpReasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const found = await ownFollowUp(user, parsed.data.followUpId, "REQUESTED");
  if ("error" in found) return { ok: false, message: found.error };
  await db.followUp.update({ where: { id: found.followUp.id }, data: { status: "DECLINED", respondedAt: new Date(), declineReason: parsed.data.reason } });
  await audit(user.id, "followup.decline", "FollowUp", found.followUp.id, { reason: parsed.data.reason });
  await notify({
    userId: found.followUp.parentId,
    type: "followup.declined",
    title: "Demande de suivi refusée",
    body: `${user.firstName} ${user.lastName} ne peut pas assurer ce suivi : ${parsed.data.reason} Vous pouvez choisir un autre tuteur.`,
    link: `/parent/suivi/${found.followUp.id}`,
    email: true,
  });
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Demande refusée." };
}

export async function endFollowUpByTutorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  const parsed = followUpReasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const found = await ownFollowUp(user, parsed.data.followUpId, "ACTIVE");
  if ("error" in found) return { ok: false, message: found.error };
  await endFollowUp(found.followUp.id, parsed.data.reason, "TUTOR");
  await audit(user.id, "followup.end", "FollowUp", found.followUp.id, { reason: parsed.data.reason, by: "TUTOR" });
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Suivi arrêté. Le parent est prévenu." };
}

export async function reportOccurrenceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireTutorSpace();
  const parsed = occurrenceReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { occurrenceId, result, comment, grades } = parsed.data;
  const occurrence = await db.taskOccurrence.findFirst({
    where: { id: occurrenceId, task: { followUp: { tutor: { userId: user.id } } } },
    include: { child: { select: { firstName: true } }, task: { select: { kind: true, title: true, photoRequired: true, followUp: { select: { id: true, status: true, parentId: true } } } } },
  });
  if (!occurrence) return { ok: false, message: "Action introuvable." };
  if (occurrence.task.followUp.status !== "ACTIVE") return { ok: false, message: "Ce suivi n'est plus actif." };
  const now = new Date();
  if (occurrence.date > localDate(now)) return { ok: false, message: "Cette action est prévue pour un autre jour." };
  const state = occurrenceState(occurrence, now);
  if (state === "missed") return { ok: false, message: "Le délai pour faire ce retour est dépassé." };
  if (state !== "todo" && state !== "late") return { ok: false, message: "Le retour a déjà été envoyé." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS) return { ok: false, message: `${MAX_PHOTOS} photos maximum.` };
  if (occurrence.task.photoRequired && result !== "NOT_DONE" && files.length === 0) return { ok: false, errors: { photos: ["Le parent demande une photo pour cette action."] } };
  if (result !== "DONE" && !comment) return { ok: false, errors: { comment: ["Expliquez au parent ce qui n'a pas pu être fait."] } };
  if (files.length > 0 && !(await rateLimit(`upload:${user.id}`, 60, 3600))) return { ok: false, message: "Trop d'envois. Réessayez plus tard." };

  const stored: { storageKey: string; mimeType: string; size: number }[] = [];
  try {
    for (const file of files) stored.push(await storeUpload(file, ["image/jpeg", "image/png"]));
  } catch (err) {
    await Promise.all(stored.map((s) => deleteStoredFile(s.storageKey)));
    return { ok: false, errors: { photos: [err instanceof Error ? err.message : "Photo refusée."] } };
  }
  const keepGrades = occurrence.task.kind === "SCHOOL_VISIT" && grades && grades.length > 0;
  // La condition sur le statut évite deux retours simultanés sur la même action.
  const updated = await db.taskOccurrence.updateMany({
    where: { id: occurrence.id, status: "PENDING" },
    data: { status: result, comment: comment ?? null, grades: keepGrades ? (grades as Prisma.InputJsonValue) : undefined, reportedAt: now },
  });
  if (updated.count === 0) {
    await Promise.all(stored.map((s) => deleteStoredFile(s.storageKey)));
    return { ok: false, message: "Le retour a déjà été envoyé." };
  }
  if (stored.length > 0) await db.occurrencePhoto.createMany({ data: stored.map((s) => ({ occurrenceId: occurrence.id, ...s })) });
  await audit(user.id, "followup.report", "TaskOccurrence", occurrence.id, { result });
  const title = occurrence.task.title || TASK_KINDS[occurrence.task.kind];
  await notify({
    userId: occurrence.task.followUp.parentId,
    type: "followup.report",
    title: `${title} · ${occurrence.child.firstName}`,
    body: `${OCCURRENCE_RESULTS[result]}${comment ? ` : ${comment.slice(0, 140)}` : "."}`,
    link: `/parent/suivi/${occurrence.task.followUp.id}`,
  });
  revalidatePath("/tuteur", "layout");
  return { ok: true, message: "Retour envoyé au parent." };
}
