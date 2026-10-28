"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { rateLimit } from "@/lib/rate-limit";
import { type ActionState, complaintSchema, fieldErrors } from "@/lib/validation";
import { notifyAdmins } from "@/server/services/notify";

export async function createComplaintAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { ok: false, message: "Action réservée aux parents et éducateurs." };
  if (!(await rateLimit(`complaint:${user.id}`, 5, 3600))) {
    return { ok: false, message: "Vous avez déposé plusieurs réclamations récemment. Réessayez plus tard." };
  }
  const parsed = complaintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const complaint = await db.complaint.create({ data: { authorId: user.id, ...parsed.data } });
  await notifyAdmins({
    type: "complaint.created",
    title: "Nouvelle réclamation",
    body: `${user.firstName} ${user.lastName} : ${parsed.data.subject}`,
    link: `/admin/reclamations/${complaint.id}`,
  });
  revalidatePath(user.role === "PARENT" ? "/parent/reclamations" : "/educateur/reclamations");
  return { ok: true, message: "Réclamation envoyée. Vous serez notifié de la réponse." };
}
