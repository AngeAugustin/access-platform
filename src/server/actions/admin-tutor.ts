"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole, requireSuperAdmin } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { type ActionState, fieldErrors, followUpReasonSchema, followUpSettingsSchema, rejectTutorSchema, tutorDecisionSchema } from "@/lib/validation";
import { notify } from "@/server/services/notify";
import { saveSettings } from "@/server/services/settings";
import { endFollowUp } from "@/server/services/follow-up";

export async function validateTutorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = tutorDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const profile = await db.tutorProfile.findUnique({ where: { id: parsed.data.tutorId } });
  if (!profile) return { ok: false, message: "Dossier introuvable." };
  if (profile.status === "INCOMPLETE") return { ok: false, message: "Le dossier n'a pas été transmis par le tuteur." };
  await db.tutorProfile.update({ where: { id: profile.id }, data: { status: "VALIDATED", validatedAt: new Date(), validatedById: admin.id, rejectionReason: null } });
  await audit(admin.id, "tutor.validate", "TutorProfile", profile.id);
  await notify({
    userId: profile.userId,
    type: "tutor.validated",
    title: "Dossier de tuteur vérifié",
    body: "Félicitations, votre dossier est validé. Les familles peuvent désormais vous demander un suivi.",
    link: "/tuteur",
    email: true,
  });
  revalidatePath("/admin/tuteurs", "layout");
  return { ok: true, message: "Tuteur validé." };
}

export async function rejectTutorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = rejectTutorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { tutorId, reason } = parsed.data;
  const profile = await db.tutorProfile.findUnique({ where: { id: tutorId }, include: { _count: { select: { followUps: { where: { status: "ACTIVE" } } } } } });
  if (!profile) return { ok: false, message: "Dossier introuvable." };
  if (profile._count.followUps > 0) return { ok: false, message: "Ce tuteur a des suivis en cours : arrêtez-les ou suspendez le compte." };
  await db.tutorProfile.update({ where: { id: tutorId }, data: { status: "REJECTED", rejectionReason: reason } });
  await audit(admin.id, "tutor.reject", "TutorProfile", tutorId, { reason });
  await notify({ userId: profile.userId, type: "tutor.rejected", title: "Dossier de tuteur à corriger", body: `Votre dossier n'a pas pu être validé : ${reason}`, link: "/tuteur/dossier", email: true });
  revalidatePath("/admin/tuteurs", "layout");
  return { ok: true, message: "Dossier rejeté. Le tuteur est prévenu." };
}

export async function saveFollowUpSettingsAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = followUpSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await saveSettings(parsed.data);
  await audit(admin.id, "settings.save", "Setting", null, parsed.data);
  revalidatePath("/admin/tarifs");
  return { ok: true, message: "Forfait du suivi enregistré." };
}

export async function adminEndFollowUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = followUpReasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const followUp = await db.followUp.findUnique({ where: { id: parsed.data.followUpId } });
  if (!followUp || followUp.status !== "ACTIVE") return { ok: false, message: "Ce suivi n'est plus actif." };
  await endFollowUp(followUp.id, parsed.data.reason, "ADMIN");
  await audit(admin.id, "followup.end", "FollowUp", followUp.id, { reason: parsed.data.reason, by: "ADMIN" });
  revalidatePath("/admin/suivis", "layout");
  return { ok: true, message: "Suivi arrêté. Le parent et le tuteur sont prévenus." };
}
