"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole, requireSuperAdmin } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { COMPLAINT_STATUS } from "@/lib/constants";
import {
  type ActionState,
  complaintHandlingSchema,
  createAdminSchema,
  fieldErrors,
  manualPayoutSchema,
  rejectEducatorSchema,
  settingsSchema,
  stopTutoringSchema,
  tariffSchema,
  validateEducatorSchema,
} from "@/lib/validation";
import { notify } from "@/server/services/notify";
import { BusinessError, stopTutoring } from "@/server/services/tutoring";
import { executeFedapayPayout, recordManualPayout } from "@/server/services/payments";
import { fedapayConfigured } from "@/server/services/fedapay";
import { saveSettings } from "@/server/services/settings";

export async function validateEducatorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = validateEducatorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { educatorId, stars, level } = parsed.data;
  const profile = await db.educatorProfile.findUnique({ where: { id: educatorId } });
  if (!profile) return { ok: false, message: "Dossier introuvable." };
  if (profile.status === "INCOMPLETE") return { ok: false, message: "Le dossier n'a pas été transmis par l'éducateur." };
  await db.educatorProfile.update({
    where: { id: educatorId },
    data: { status: "VALIDATED", stars, level, validatedAt: new Date(), validatedById: admin.id, rejectionReason: null },
  });
  await audit(admin.id, "educator.validate", "EducatorProfile", educatorId, { stars, level });
  await notify({
    userId: profile.userId,
    type: "educator.validated",
    title: "Dossier vérifié",
    body: `Félicitations, votre dossier est validé (niveau ${level}). Vous êtes désormais visible des familles.`,
    link: "/educateur",
    email: true,
  });
  revalidatePath("/admin/educateurs");
  return { ok: true, message: "Éducateur validé." };
}

export async function rejectEducatorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = rejectEducatorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { educatorId, reason } = parsed.data;
  const profile = await db.educatorProfile.findUnique({ where: { id: educatorId }, include: { _count: { select: { bookedSlots: true } } } });
  if (!profile) return { ok: false, message: "Dossier introuvable." };
  if (profile._count.bookedSlots > 0) return { ok: false, message: "Cet éducateur a des tutorats en cours : arrêtez-les ou suspendez le compte." };
  await db.educatorProfile.update({ where: { id: educatorId }, data: { status: "REJECTED", rejectionReason: reason } });
  await audit(admin.id, "educator.reject", "EducatorProfile", educatorId, { reason });
  await notify({
    userId: profile.userId,
    type: "educator.rejected",
    title: "Dossier à corriger",
    body: `Votre dossier n'a pas pu être validé : ${reason}`,
    link: "/educateur/dossier",
    email: true,
  });
  revalidatePath("/admin/educateurs");
  return { ok: true, message: "Dossier rejeté, l'éducateur a été prévenu." };
}

const statusSchema = z.object({ userId: z.string().min(1), status: z.enum(["ACTIVE", "SUSPENDED"]) });

export async function setUserStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { userId, status } = parsed.data;
  if (userId === admin.id) return { ok: false, message: "Vous ne pouvez pas modifier votre propre compte." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, message: "Compte introuvable." };
  if (target.role === "ADMIN" && !admin.isSuperAdmin) return { ok: false, message: "Seul un super-administrateur peut suspendre un administrateur." };
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === "SUSPENDED") await destroyAllSessions(userId);
  await audit(admin.id, status === "SUSPENDED" ? "user.suspend" : "user.reactivate", "User", userId);
  revalidatePath("/admin", "layout");
  return { ok: true, message: status === "SUSPENDED" ? "Compte suspendu et déconnecté." : "Compte réactivé." };
}

export async function handleComplaintAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = complaintHandlingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { complaintId, status, response } = parsed.data;
  const complaint = await db.complaint.findUnique({ where: { id: complaintId }, include: { author: true } });
  if (!complaint) return { ok: false, message: "Réclamation introuvable." };
  await db.complaint.update({ where: { id: complaintId }, data: { status, response, handledById: admin.id, handledAt: new Date() } });
  await audit(admin.id, "complaint.handle", "Complaint", complaintId, { status });
  await notify({
    userId: complaint.authorId,
    type: "complaint.answered",
    title: `Réclamation : ${COMPLAINT_STATUS[status].toLowerCase()}`,
    body: response.slice(0, 300),
    link: complaint.author.role === "PARENT" ? "/parent/reclamations" : "/educateur/reclamations",
    email: true,
  });
  revalidatePath("/admin/reclamations");
  return { ok: true, message: "Réponse envoyée." };
}

export async function saveTariffAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = tariffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { classLevel, ...rest } = parsed.data;
  await db.tariff.upsert({ where: { classLevel }, create: parsed.data, update: rest });
  await audit(admin.id, "tariff.save", "Tariff", classLevel, rest);
  revalidatePath("/admin/tarifs");
  return { ok: true, message: `Tarif ${classLevel} enregistré. Il s'applique aux nouveaux tutorats.` };
}

export async function saveSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await saveSettings(parsed.data);
  await audit(admin.id, "settings.save", "Setting", null, parsed.data);
  revalidatePath("/admin/tarifs");
  return { ok: true, message: "Paramètres enregistrés." };
}

export async function createAdminAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = createAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { password, ...data } = parsed.data;
  try {
    const created = await db.user.create({ data: { ...data, role: "ADMIN", passwordHash: await hashPassword(password) } });
    await audit(admin.id, "admin.create", "User", created.id);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, message: "Un compte existe déjà avec ce NPI, cet e-mail ou ce téléphone." };
    }
    throw err;
  }
  revalidatePath("/admin/administrateurs");
  return { ok: true, message: "Administrateur créé. Transmettez-lui son mot de passe provisoire par un canal sûr." };
}

export async function fedapayPayoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const payoutId = String(formData.get("payoutId") ?? "");
  if (!fedapayConfigured()) return { ok: false, message: "FedaPay n'est pas configuré sur ce serveur." };
  try {
    await executeFedapayPayout(payoutId, admin.id);
  } catch (err) {
    if (err instanceof BusinessError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath("/admin/paiements");
  return { ok: true, message: "Reversement envoyé via FedaPay." };
}

export async function manualPayoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = manualPayoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await recordManualPayout(parsed.data.payoutId, admin.id, parsed.data.providerReference);
  } catch (err) {
    if (err instanceof BusinessError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath("/admin/paiements");
  return { ok: true, message: "Reversement enregistré." };
}

export async function adminStopTutoringAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = stopTutoringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await stopTutoring(parsed.data.tutoringId, { id: admin.id, role: "ADMIN" }, parsed.data.reason);
  } catch (err) {
    if (err instanceof BusinessError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath(`/admin/tutorats/${parsed.data.tutoringId}`);
  return { ok: true, message: "Tutorat arrêté." };
}

const disputeSchema = z.object({ lessonId: z.string().min(1), decision: z.enum(["CONFIRMED", "REMOVE"]) });

// Arbitrage d'une séance contestée : validée malgré la contestation, ou supprimée.
export async function resolveDisputeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = disputeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const lesson = await db.lesson.findUnique({ where: { id: parsed.data.lessonId }, include: { tutoring: { include: { educator: true } } } });
  if (!lesson || lesson.status !== "DISPUTED") return { ok: false, message: "Séance introuvable ou non contestée." };
  if (parsed.data.decision === "REMOVE") {
    await db.lesson.delete({ where: { id: lesson.id } });
  } else {
    await db.lesson.update({ where: { id: lesson.id }, data: { status: "CONFIRMED" } });
  }
  await audit(admin.id, `lesson.dispute_${parsed.data.decision.toLowerCase()}`, "Lesson", lesson.id);
  const text = parsed.data.decision === "REMOVE" ? "a été retirée après examen" : "a été validée après examen";
  for (const userId of [lesson.tutoring.parentId, lesson.tutoring.educator.userId]) {
    await notify({ userId, type: "lesson.dispute_resolved", title: "Contestation traitée", body: `La séance du ${lesson.date.toISOString().slice(0, 10)} ${text}.` });
  }
  revalidatePath(`/admin/tutorats/${lesson.tutoringId}`);
  return { ok: true, message: "Contestation traitée." };
}
