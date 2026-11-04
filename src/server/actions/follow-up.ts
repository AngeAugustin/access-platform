"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { followUpReference } from "@/lib/ids";
import { followUpPrice, localDate } from "@/lib/follow-up";
import { fullName } from "@/lib/format";
import { type ActionState, fieldErrors, followUpReasonSchema, followUpRequestSchema, followUpTasksSchema, occurrenceFeedbackSchema } from "@/lib/validation";
import { getSettings } from "@/server/services/settings";
import { notify } from "@/server/services/notify";
import { clearUpcomingOccurrences, endFollowUp, ensureOccurrences } from "@/server/services/follow-up";

const OPEN_STATUSES = ["REQUESTED", "ACTIVE"] as const;

export async function requestFollowUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = followUpRequestSchema.safeParse({ ...Object.fromEntries(formData), childIds: formData.getAll("childIds") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { tutorId, childIds, startDate, message, tasks } = parsed.data;
  if (startDate < localDate()) return { ok: false, errors: { startDate: ["La date de début est passée."] } };

  const tutor = await db.tutorProfile.findFirst({ where: { id: tutorId, status: "VALIDATED", user: { status: "ACTIVE" } }, include: { user: { select: { firstName: true, lastName: true } } } });
  if (!tutor) return { ok: false, message: "Ce tuteur n'est pas disponible." };
  const children = await db.child.findMany({ where: { id: { in: childIds }, parentId: parent.id }, select: { id: true, firstName: true } });
  if (children.length !== childIds.length) return { ok: false, message: "Enfant introuvable." };
  if (tasks.some((t) => t.childIds.some((id) => !childIds.includes(id)))) return { ok: false, message: "Une action concerne un enfant qui n'est pas dans le suivi." };
  // Un enfant n'a qu'un suivi à la fois : deux tuteurs ne se partagent pas les mêmes soirées.
  const busy = await db.followUpChild.findFirst({ where: { childId: { in: childIds }, followUp: { status: { in: [...OPEN_STATUSES] } } }, include: { child: { select: { firstName: true } } } });
  if (busy) return { ok: false, message: `${busy.child.firstName} a déjà un suivi en cours ou une demande en attente.` };

  const settings = await getSettings();
  const followUp = await db.followUp.create({
    data: {
      reference: followUpReference(),
      parentId: parent.id,
      tutorId: tutor.id,
      startDate,
      message: message ?? null,
      monthlyPrice: followUpPrice(children.length, settings),
      commissionPercent: settings.followUpCommissionPercent,
      children: { create: childIds.map((childId) => ({ childId })) },
      tasks: { create: tasks.map((t) => ({ ...t, instructions: t.instructions ?? null })) },
    },
  });
  await audit(parent.id, "followup.request", "FollowUp", followUp.id, { tutorId, children: childIds.length, tasks: tasks.length });
  await notify({
    userId: tutor.userId,
    type: "followup.requested",
    title: "Nouvelle demande de suivi",
    body: `${fullName(parent)} vous demande de suivre ${children.map((c) => c.firstName).join(" et ")} (${tasks.length} action${tasks.length > 1 ? "s" : ""}).`,
    link: `/tuteur/familles/${followUp.id}`,
    email: true,
  });
  revalidatePath("/parent/suivi");
  redirect(`/parent/suivi/${followUp.id}`);
}

async function ownFollowUp(parentId: string, followUpId: string) {
  return db.followUp.findFirst({ where: { id: followUpId, parentId }, include: { tutor: { select: { userId: true } }, children: { select: { childId: true } } } });
}

export async function cancelFollowUpRequestAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const followUp = await ownFollowUp(parent.id, String(formData.get("followUpId") ?? ""));
  if (!followUp) return { ok: false, message: "Suivi introuvable." };
  if (followUp.status !== "REQUESTED") return { ok: false, message: "Le tuteur a déjà répondu à cette demande." };
  await db.followUp.update({ where: { id: followUp.id }, data: { status: "CANCELLED", endedAt: new Date() } });
  await audit(parent.id, "followup.cancel", "FollowUp", followUp.id);
  await notify({ userId: followUp.tutor.userId, type: "followup.cancelled", title: "Demande retirée", body: `${fullName(parent)} a retiré sa demande de suivi.`, link: "/tuteur/familles" });
  revalidatePath("/parent/suivi", "layout");
  return { ok: true, message: "Demande retirée." };
}

// Remplace la liste des actions : les actions modifiées ou retirées perdent leurs passages à venir, puis tout est recalculé.
export async function updateFollowUpTasksAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = followUpTasksSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const followUp = await ownFollowUp(parent.id, parsed.data.followUpId);
  if (!followUp) return { ok: false, message: "Suivi introuvable." };
  if (followUp.status !== "ACTIVE" && followUp.status !== "REQUESTED") return { ok: false, message: "Ce suivi est clôturé." };
  const childIds = followUp.children.map((c) => c.childId);
  if (parsed.data.tasks.some((t) => t.childIds.some((id) => !childIds.includes(id)))) return { ok: false, message: "Une action concerne un enfant qui n'est pas dans le suivi." };

  const existing = await db.followUpTask.findMany({ where: { followUpId: followUp.id, active: true } });
  const kept = new Set<string>();
  for (const { id, ...t } of parsed.data.tasks) {
    const data = { ...t, instructions: t.instructions ?? null };
    const current = id ? existing.find((e) => e.id === id) : undefined;
    if (!current) {
      await db.followUpTask.create({ data: { ...data, followUpId: followUp.id } });
      continue;
    }
    kept.add(current.id);
    const same =
      current.kind === data.kind &&
      current.title === data.title &&
      current.instructions === data.instructions &&
      current.intervalWeeks === data.intervalWeeks &&
      current.dueHour === data.dueHour &&
      current.photoRequired === data.photoRequired &&
      [...current.childIds].sort().join() === [...data.childIds].sort().join() &&
      [...current.days].sort().join() === [...data.days].sort().join();
    if (same) continue;
    await db.followUpTask.update({ where: { id: current.id }, data });
    await clearUpcomingOccurrences({ id: current.id });
  }
  const removed = existing.filter((e) => !kept.has(e.id)).map((e) => e.id);
  if (removed.length > 0) {
    await db.followUpTask.updateMany({ where: { id: { in: removed } }, data: { active: false } });
    await clearUpcomingOccurrences({ id: { in: removed } });
  }
  await ensureOccurrences({ id: followUp.id });
  await audit(parent.id, "followup.tasks", "FollowUp", followUp.id, { tasks: parsed.data.tasks.length });
  if (followUp.status === "ACTIVE") {
    await notify({ userId: followUp.tutor.userId, type: "followup.tasks", title: "Actions modifiées", body: `${fullName(parent)} a mis à jour les actions du suivi.`, link: `/tuteur/familles/${followUp.id}` });
  }
  revalidatePath(`/parent/suivi/${followUp.id}`);
  return { ok: true, message: "Actions enregistrées." };
}

export async function endFollowUpByParentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = followUpReasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const followUp = await ownFollowUp(parent.id, parsed.data.followUpId);
  if (!followUp) return { ok: false, message: "Suivi introuvable." };
  if (followUp.status !== "ACTIVE") return { ok: false, message: "Ce suivi n'est plus actif." };
  await endFollowUp(followUp.id, parsed.data.reason, "PARENT");
  await audit(parent.id, "followup.end", "FollowUp", followUp.id, { reason: parsed.data.reason, by: "PARENT" });
  revalidatePath("/parent/suivi", "layout");
  return { ok: true, message: "Suivi arrêté. Le tuteur est prévenu." };
}

// « Vu » sur un retour, avec un mot facultatif pour le tuteur.
export async function occurrenceFeedbackAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = occurrenceFeedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const occurrence = await db.taskOccurrence.findFirst({
    where: { id: parsed.data.occurrenceId, task: { followUp: { parentId: parent.id } } },
    include: { child: { select: { firstName: true } }, task: { select: { title: true, followUp: { select: { id: true, tutor: { select: { userId: true } } } } } } },
  });
  if (!occurrence || !occurrence.reportedAt) return { ok: false, message: "Retour introuvable." };
  await db.taskOccurrence.update({ where: { id: occurrence.id }, data: { parentSeenAt: occurrence.parentSeenAt ?? new Date(), parentComment: parsed.data.comment ?? occurrence.parentComment } });
  if (parsed.data.comment) {
    await notify({
      userId: occurrence.task.followUp.tutor.userId,
      type: "followup.feedback",
      title: `Réponse du parent · ${occurrence.child.firstName}`,
      body: parsed.data.comment.slice(0, 160),
      link: `/tuteur/familles/${occurrence.task.followUp.id}`,
    });
  }
  revalidatePath(`/parent/suivi/${occurrence.task.followUp.id}`);
  return { ok: true, message: parsed.data.comment ? "Réponse envoyée au tuteur." : "Marqué comme vu." };
}
