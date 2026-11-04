"use server";

import { audit } from "@/lib/audit";
import { verifyPow } from "@/lib/pow";
import { rateLimitIp } from "@/lib/rate-limit";
import { requestInfo } from "@/lib/request";
import { type ActionState, contactSchema, fieldErrors } from "@/lib/validation";
import { notifyAdmins } from "@/server/services/notify";

const PROFILES = { PARENT: "Parent", EDUCATOR: "Éducateur", OTHER: "Autre" } as const;

// Message d'un visiteur : transmis aux administrateurs (notification + e-mail), protégé par l'anti-robot et une limite par IP.
export async function contactAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  if (!(await verifyPow(formData.get("pow"), "contact"))) {
    return { ok: false, powRequired: true, message: "Vérification de sécurité en cours…" };
  }
  const { ip } = await requestInfo();
  if (!(await rateLimitIp("contact", ip, 5, 3600))) {
    return { ok: false, message: "Trop de messages envoyés depuis votre connexion. Réessayez dans une heure." };
  }
  const d = parsed.data;
  await notifyAdmins({
    type: "contact.message",
    title: `Contact : ${d.subject}`,
    body: `${d.name} (${PROFILES[d.profile]}, ${d.email}${d.phone ? `, ${d.phone}` : ""}) : ${d.message}`,
    email: true,
  });
  await audit(null, "contact.message", "Contact", null, { email: d.email, profile: d.profile, subject: d.subject });
  return { ok: true, message: "Message envoyé. L'équipe Access vous répondra par e-mail." };
}
