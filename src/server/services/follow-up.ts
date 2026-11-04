import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { REPORT_GRACE_HOURS, TASK_KINDS } from "@/lib/constants";
import { addDays, dueAtFor, localDate, occurrenceDates } from "@/lib/follow-up";
import { fullName } from "@/lib/format";
import { notify } from "./notify";

// Passages générés à l'avance : la semaine qui vient, recalculés chaque jour et à chaque changement d'action.
const DAYS_AHEAD = 7;

// Crée les passages manquants des suivis actifs, d'aujourd'hui à J+7. Sans effet sur ceux qui existent déjà.
export async function ensureOccurrences(where: Prisma.FollowUpWhereInput = {}, now = new Date()): Promise<number> {
  const today = localDate(now);
  const until = addDays(today, DAYS_AHEAD);
  const followUps = await db.followUp.findMany({
    where: { ...where, status: "ACTIVE" },
    select: { startDate: true, children: { select: { childId: true } }, tasks: { where: { active: true } } },
  });
  const data: Prisma.TaskOccurrenceCreateManyInput[] = [];
  for (const f of followUps) {
    const children = new Set(f.children.map((c) => c.childId));
    for (const task of f.tasks) {
      for (const date of occurrenceDates(task, f.startDate, today, until)) {
        for (const childId of task.childIds) {
          if (children.has(childId)) data.push({ taskId: task.id, childId, date, dueAt: dueAtFor(date, task.dueHour) });
        }
      }
    }
  }
  if (data.length === 0) return 0;
  const created = await db.taskOccurrence.createMany({ data, skipDuplicates: true });
  return created.count;
}

// Retire les passages à venir encore à faire (action modifiée ou retirée, suivi arrêté). Aujourd'hui compris,
// sauf si l'heure limite est déjà passée : ces passages restent à rapporter.
export async function clearUpcomingOccurrences(where: Prisma.FollowUpTaskWhereInput, now = new Date()) {
  await db.taskOccurrence.deleteMany({ where: { task: where, status: "PENDING", dueAt: { gt: now } } });
}

// Passages restés sans retour au-delà du délai : marqués manqués, parent et tuteur prévenus (un message par suivi).
export async function markMissedOccurrences(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - REPORT_GRACE_HOURS * 3600_000);
  const missed = await db.taskOccurrence.findMany({
    where: { status: "PENDING", dueAt: { lt: limit } },
    select: { id: true, child: { select: { firstName: true } }, task: { select: { kind: true, title: true, followUp: { select: { id: true, parentId: true, tutor: { select: { userId: true } } } } } } },
  });
  if (missed.length === 0) return 0;
  await db.taskOccurrence.updateMany({ where: { id: { in: missed.map((o) => o.id) } }, data: { status: "MISSED" } });

  const byFollowUp = new Map<string, typeof missed>();
  for (const o of missed) byFollowUp.set(o.task.followUp.id, [...(byFollowUp.get(o.task.followUp.id) ?? []), o]);
  for (const [id, items] of byFollowUp) {
    const { parentId, tutor } = items[0].task.followUp;
    const list = items
      .slice(0, 3)
      .map((o) => `${o.task.title || TASK_KINDS[o.task.kind]} (${o.child.firstName})`)
      .join(", ");
    const more = items.length > 3 ? ` et ${items.length - 3} autre(s)` : "";
    const body = `${items.length} action(s) sans retour : ${list}${more}.`;
    await notify({ userId: parentId, type: "followup.missed", title: "Actions sans retour", body, link: `/parent/suivi/${id}` });
    await notify({ userId: tutor.userId, type: "followup.missed", title: "Retours manqués", body: `${body} Pensez à faire vos retours à temps.`, link: `/tuteur/familles/${id}` });
  }
  return missed.length;
}

export async function endFollowUp(followUpId: string, reason: string, by: "PARENT" | "TUTOR" | "ADMIN") {
  const followUp = await db.followUp.update({
    where: { id: followUpId },
    data: { status: "ENDED", endedAt: new Date(), endReason: reason },
    include: { parent: { select: { firstName: true, lastName: true } }, tutor: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } } },
  });
  await clearUpcomingOccurrences({ followUpId });
  const parentText = by === "TUTOR" ? `${fullName(followUp.tutor.user)} a arrêté le suivi.` : by === "ADMIN" ? "Access a arrêté le suivi." : "Vous avez arrêté le suivi.";
  const tutorText = by === "PARENT" ? `${fullName(followUp.parent)} a arrêté le suivi.` : by === "ADMIN" ? "Access a arrêté le suivi." : "Vous avez arrêté le suivi.";
  if (by !== "PARENT") await notify({ userId: followUp.parentId, type: "followup.ended", title: "Suivi arrêté", body: `${parentText} Motif : ${reason}`, link: `/parent/suivi/${followUp.id}`, email: true });
  if (by !== "TUTOR") await notify({ userId: followUp.tutor.userId, type: "followup.ended", title: "Suivi arrêté", body: `${tutorText} Motif : ${reason}`, link: `/tuteur/familles/${followUp.id}`, email: true });
  return followUp;
}
