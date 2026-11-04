"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { type CurrentUser, requireRole, requireSuperAdmin } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessions } from "@/lib/auth/session";
import { isLocked } from "@/lib/auth/lockout";
import { audit } from "@/lib/audit";
import { formatFcfa, fullName } from "@/lib/format";
import { provisionalPassword } from "@/lib/ids";
import { reset } from "@/lib/rate-limit";
import { COMPLAINT_STATUS } from "@/lib/constants";
import {
  type ActionState,
  complaintHandlingSchema,
  createAdminSchema,
  fieldErrors,
  manualPayoutSchema,
  refundDoneSchema,
  rejectEducatorSchema,
  resolveAnomalySchema,
  settingsSchema,
  stopTutoringSchema,
  tariffSchema,
  validateEducatorSchema,
} from "@/lib/validation";
import { escapeHtml, sendMail } from "@/server/services/mail";
import { notify } from "@/server/services/notify";
import { BusinessError, stopTutoring } from "@/server/services/tutoring";
import { executeFedapayPayout, recordManualPayout, syncPayout, syncTransaction } from "@/server/services/payments";
import { fedapayConfigured } from "@/server/services/fedapay";
import { saveSettings } from "@/server/services/settings";
import { cycleOfClass } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";

export async function validateEducatorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = validateEducatorSchema.safeParse({ ...Object.fromEntries(formData), cycles: formData.getAll("cycles") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { educatorId, stars, cycles } = parsed.data;
  const profile = await db.educatorProfile.findUnique({ where: { id: educatorId } });
  if (!profile) return { ok: false, message: "Dossier introuvable." };
  if (profile.status === "INCOMPLETE") return { ok: false, message: "Le dossier n'a pas été transmis par l'éducateur." };
  // Retirer un cycle retire aussi les classes de ce cycle.
  const curriculum = await getCurriculum();
  const classLevels = profile.classLevels.filter((c) => (cycles as string[]).includes(cycleOfClass(curriculum, c) ?? ""));
  await db.educatorProfile.update({
    where: { id: educatorId },
    data: { status: "VALIDATED", stars, cycles, classLevels, validatedAt: new Date(), validatedById: admin.id, rejectionReason: null },
  });
  await audit(admin.id, "educator.validate", "EducatorProfile", educatorId, { stars, cycles });
  await notify({
    userId: profile.userId,
    type: "educator.validated",
    title: "Dossier vérifié",
    body: `Félicitations, votre dossier est validé (${cycles.join(", ")}). Vous êtes désormais visible des familles.`,
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
  if (profile._count.bookedSlots > 0) return { ok: false, message: "Cet éducateur a des accompagnements en cours : arrêtez-les ou suspendez le compte." };
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

// ---------------------------------------------------------------------------
// Gestion des comptes utilisateurs (réservée à l'administration)
// ---------------------------------------------------------------------------

const userIdSchema = z.object({ userId: z.string().min(1) });
const statusSchema = userIdSchema.extend({ status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]) });

// Contrôles communs : pas d'action sur son propre compte, et le compte d'un administrateur n'est géré que par un super-administrateur.
async function manageableUser(admin: CurrentUser, userId: string) {
  if (userId === admin.id) return { error: "Vous ne pouvez pas modifier votre propre compte." } as const;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Compte introuvable." } as const;
  if (target.role === "ADMIN" && !admin.isSuperAdmin) return { error: "Seul un super-administrateur peut gérer le compte d'un administrateur." } as const;
  return { target } as const;
}

const STATUS_AUDIT = { ACTIVE: "user.reactivate", SUSPENDED: "user.suspend", DEACTIVATED: "user.deactivate" } as const;
const STATUS_DONE = {
  ACTIVE: "Compte réactivé.",
  SUSPENDED: "Compte suspendu et déconnecté.",
  DEACTIVATED: "Compte désactivé et déconnecté.",
} as const;

export async function setUserStatusAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { userId, status } = parsed.data;
  const found = await manageableUser(admin, userId);
  if ("error" in found) return { ok: false, message: found.error };
  if (found.target.status === status) return { ok: true, message: "Aucun changement." };
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status !== "ACTIVE") await destroyAllSessions(userId);
  await audit(admin.id, STATUS_AUDIT[status], "User", userId, { from: found.target.status });
  revalidatePath("/admin", "layout");
  return { ok: true, message: STATUS_DONE[status] };
}

// Lève le verrou posé après des échecs de connexion répétés (seul moyen de le lever avant son expiration).
export async function unlockUserAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const found = await manageableUser(admin, parsed.data.userId);
  if ("error" in found) return { ok: false, message: found.error };
  const { target } = found;
  if (!isLocked(target.lockedUntil) && target.failedLogins === 0) return { ok: true, message: "Ce compte n'est pas verrouillé." };
  await db.user.update({ where: { id: target.id }, data: { lockedUntil: null, failedLogins: 0 } });
  await reset(`login:fail:email:${target.email}`);
  await audit(admin.id, "user.unlock", "User", target.id, { lockedUntil: target.lockedUntil?.toISOString() ?? null, failedLogins: target.failedLogins });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Verrou levé : l'utilisateur peut de nouveau se connecter." };
}

// Fixe un mot de passe provisoire, affiché une seule fois à l'administrateur ; l'utilisateur devra le remplacer à sa prochaine connexion.
export async function resetUserPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = userIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const found = await manageableUser(admin, parsed.data.userId);
  if ("error" in found) return { ok: false, message: found.error };
  const { target } = found;
  const password = provisionalPassword();
  await db.$transaction([
    db.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } }),
    db.passwordResetToken.updateMany({ where: { userId: target.id, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(target.id);
  await audit(admin.id, "user.password_reset_by_admin", "User", target.id);
  await sendMail(
    target.email,
    "Votre mot de passe Access a été réinitialisé",
    "Mot de passe réinitialisé",
    `<p>Bonjour ${escapeHtml(target.firstName)},</p><p>L'équipe Access a réinitialisé votre mot de passe. Un mot de passe provisoire vous sera communiqué directement ; vous devrez le remplacer à votre prochaine connexion.</p><p>Si vous n'êtes pas à l'origine de cette demande, contactez le support Access.</p>`,
  ).catch(() => {});
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `Mot de passe provisoire : ${password}. Transmettez-le par un canal sûr : il ne sera plus affiché. L'utilisateur devra le changer à sa prochaine connexion.`,
  };
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
  if (!(await db.classLevel.findUnique({ where: { name: classLevel } }))) return { ok: false, errors: { classLevel: ["Classe invalide."] } };
  await db.tariff.upsert({ where: { classLevel }, create: parsed.data, update: rest });
  await audit(admin.id, "tariff.save", "Tariff", classLevel, rest);
  revalidatePath("/admin/tarifs");
  return { ok: true, message: `Tarif ${classLevel} enregistré. Il s'applique aux nouveaux accompagnements.` };
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
    const created = await db.user.create({ data: { ...data, role: "ADMIN", passwordHash: await hashPassword(password), mustChangePassword: true } });
    await audit(admin.id, "admin.create", "User", created.id);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, message: "Un compte existe déjà avec ce NPI, cet e-mail ou ce téléphone." };
    }
    throw err;
  }
  revalidatePath("/admin/administrateurs");
  return { ok: true, message: "Administrateur créé. Transmettez-lui son mot de passe provisoire par un canal sûr : il devra le changer à sa première connexion." };
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
  return { ok: true, message: "Reversement lancé : il sera marqué « Reversé » dès la confirmation de FedaPay." };
}

export async function checkPayoutAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const payoutId = String(formData.get("payoutId") ?? "");
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout?.providerReference || payout.method !== "FEDAPAY") return { ok: false, message: "Reversement introuvable." };
  let result;
  try {
    result = await syncPayout(payout.providerReference);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "FedaPay injoignable." };
  }
  revalidatePath("/admin/paiements");
  const messages = {
    done: "Confirmé : les fonds ont été envoyés.",
    failed: "FedaPay signale un échec : vous pouvez relancer le reversement.",
    processing: "Toujours en cours chez FedaPay.",
    unknown: "Reversement inconnu de FedaPay.",
    already: "Statut déjà à jour.",
  } as const;
  return { ok: result !== "failed" && result !== "unknown", message: messages[result] };
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

export async function checkPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const paymentId = String(formData.get("paymentId") ?? "");
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerTransactionId) return { ok: false, message: "Paiement introuvable." };
  let result;
  try {
    result = await syncTransaction(payment.providerTransactionId);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "FedaPay injoignable." };
  }
  revalidatePath("/admin/paiements");
  const messages = {
    approved: "Confirmé : le paiement est enregistré.",
    already: "Statut déjà à jour.",
    declined: "FedaPay signale un paiement refusé ou annulé.",
    pending: "Toujours en attente chez FedaPay : le parent n'a pas finalisé le paiement.",
    unknown: "Transaction inconnue de FedaPay.",
    mismatch: "Le montant payé ne correspond pas à l'échéance.",
  } as const;
  return { ok: result === "approved" || result === "already" || result === "declined", message: messages[result] };
}

export async function resolvePaymentAnomalyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = resolveAnomalySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { paymentId, note } = parsed.data;
  const resolved = await db.payment.updateMany({
    where: { id: paymentId, anomaly: { not: null }, anomalyResolvedAt: null },
    data: { anomalyResolvedAt: new Date(), anomalyResolvedById: admin.id, anomalyNote: note },
  });
  if (resolved.count === 0) return { ok: false, message: "Anomalie introuvable ou déjà traitée." };
  await audit(admin.id, "payment.anomaly_resolved", "Payment", paymentId, { note });
  revalidatePath("/admin/paiements");
  return { ok: true, message: "Anomalie marquée comme traitée." };
}

export async function markRefundDoneAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = refundDoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { installmentId, note } = parsed.data;
  const done = await db.installment.updateMany({
    where: { id: installmentId, refundAmount: { gt: 0 }, refundedAt: null },
    data: { refundedAt: new Date(), refundedById: admin.id, refundNote: note },
  });
  if (done.count === 0) return { ok: false, message: "Remboursement introuvable ou déjà traité." };
  const installment = await db.installment.findUniqueOrThrow({ where: { id: installmentId }, include: { tutoring: { include: { child: true } } } });
  await audit(admin.id, "installment.refunded", "Installment", installmentId, { note, amount: installment.refundAmount });
  await notify({
    userId: installment.tutoring.parentId,
    type: "refund.done",
    title: "Remboursement effectué",
    body: `Access vous a remboursé ${formatFcfa(installment.refundAmount ?? 0)} pour l'accompagnement de ${fullName(installment.tutoring.child)}.`,
    link: `/parent/tutorats/${installment.tutoringId}`,
    email: true,
  });
  revalidatePath("/admin/paiements");
  return { ok: true, message: "Remboursement enregistré." };
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
  return { ok: true, message: "Accompagnement arrêté." };
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
