import "server-only";
import { db } from "@/lib/db";
import { REPORT_GRACE_HOURS } from "@/lib/constants";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Reliability = { reported: number; missed: number; rate: number | null };

// Fiabilité d'un tuteur sur 30 jours : part des actions échues ayant reçu un retour dans le délai.
export async function tutorReliability(tutorIds: string[], now = new Date()): Promise<Map<string, Reliability>> {
  const result = new Map<string, Reliability>();
  if (tutorIds.length === 0) return result;
  const closed = new Date(now.getTime() - REPORT_GRACE_HOURS * 3600_000);
  const rows = await db.taskOccurrence.findMany({
    where: { dueAt: { gte: new Date(now.getTime() - 30 * DAY_MS), lt: closed }, task: { followUp: { tutorId: { in: tutorIds } } } },
    select: { status: true, task: { select: { followUp: { select: { tutorId: true } } } } },
  });
  for (const id of tutorIds) result.set(id, { reported: 0, missed: 0, rate: null });
  for (const r of rows) {
    const stats = result.get(r.task.followUp.tutorId)!;
    if (r.status === "PENDING" || r.status === "MISSED") stats.missed++;
    else stats.reported++;
  }
  for (const stats of result.values()) {
    const total = stats.reported + stats.missed;
    stats.rate = total > 0 ? Math.round((stats.reported / total) * 100) : null;
  }
  return result;
}

// Retours de la semaine pour un suivi : faits / attendus (passages échus ou rapportés).
export async function weekProgress(followUpId: string, from: Date, to: Date) {
  const rows = await db.taskOccurrence.findMany({ where: { task: { followUpId }, date: { gte: from, lte: to } }, select: { status: true } });
  return { done: rows.filter((r) => r.status === "DONE" || r.status === "PARTIAL").length, total: rows.length };
}
