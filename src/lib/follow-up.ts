import { REPORT_GRACE_HOURS, TASK_INTERVALS, WEEKDAYS, type WeekdayKey } from "@/lib/constants";

// Règles du suivi, partagées entre le serveur et le navigateur : prix, récurrence des actions, état d'un passage.
// Les dates d'un passage sont des dates calendaires du Bénin (UTC+1, sans heure d'été), stockées à minuit UTC.

const OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DAY_KEYS: WeekdayKey[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
export const WEEK_ORDER: WeekdayKey[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function followUpPrice(childCount: number, grid: { followUpFirstChild: number; followUpExtraChild: number }): number {
  if (childCount <= 0) return 0;
  return grid.followUpFirstChild + (childCount - 1) * grid.followUpExtraChild;
}

// Part du tuteur après la commission Access, arrondie au franc.
export function tutorShare(monthlyPrice: number, commissionPercent: number): number {
  return Math.round((monthlyPrice * (100 - commissionPercent)) / 100);
}

// Date du jour au Bénin, à minuit UTC (même forme que les colonnes @db.Date).
export function localDate(now = new Date()): Date {
  const local = now.getTime() + OFFSET_MS;
  return new Date(local - (local % DAY_MS));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function weekdayOf(date: Date): WeekdayKey {
  return DAY_KEYS[date.getUTCDay()];
}

// Lundi de la semaine d'une date calendaire.
function mondayOf(date: Date): number {
  const day = (date.getUTCDay() + 6) % 7;
  return date.getTime() - day * DAY_MS;
}

// Heure limite d'un passage : `dueHour` heure du Bénin, le jour même.
export function dueAtFor(date: Date, dueHour: number): Date {
  return new Date(date.getTime() + dueHour * 3600_000 - OFFSET_MS);
}

export type Recurrence = { days: WeekdayKey[]; intervalWeeks: number };

// Jours où l'action revient entre `from` et `to` inclus. Pour un rythme de N semaines, les semaines comptent
// à partir de celle du début du suivi (`anchor`).
export function occurrenceDates(task: Recurrence, anchor: Date, from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const anchorWeek = mondayOf(anchor);
  const start = Math.max(from.getTime(), anchor.getTime());
  for (let t = start; t <= to.getTime(); t += DAY_MS) {
    const date = new Date(t);
    if (!task.days.includes(weekdayOf(date))) continue;
    const weeks = Math.round((mondayOf(date) - anchorWeek) / WEEK_MS);
    if (weeks % Math.max(1, task.intervalWeeks) === 0) dates.push(date);
  }
  return dates;
}

export function recurrenceLabel(task: Recurrence & { dueHour: number }): string {
  const days = WEEK_ORDER.filter((d) => task.days.includes(d));
  const dayText = days.length === 7 ? "tous les jours" : days.map((d) => WEEKDAYS[d].slice(0, 3).toLowerCase() + ".").join(" ");
  const rhythm = task.intervalWeeks > 1 ? ` · ${TASK_INTERVALS[task.intervalWeeks as keyof typeof TASK_INTERVALS]?.toLowerCase() ?? `toutes les ${task.intervalWeeks} semaines`}` : "";
  return `${dayText}${rhythm} · avant ${task.dueHour} h`;
}

export type OccurrenceState = "todo" | "late" | "missed" | "DONE" | "PARTIAL" | "NOT_DONE";

// « late » : l'heure est passée mais le tuteur peut encore faire son retour ; « missed » : délai écoulé sans retour.
export function occurrenceState(o: { status: string; dueAt: Date }, now = new Date()): OccurrenceState {
  if (o.status === "DONE" || o.status === "PARTIAL" || o.status === "NOT_DONE") return o.status;
  if (o.status === "MISSED") return "missed";
  if (now.getTime() <= o.dueAt.getTime()) return "todo";
  return now.getTime() <= reportDeadline(o.dueAt).getTime() ? "late" : "missed";
}

export function reportDeadline(dueAt: Date): Date {
  return new Date(dueAt.getTime() + REPORT_GRACE_HOURS * 3600_000);
}

export type Grade = { subject: string; score: number; outOf: number };

export function readGrades(value: unknown): Grade[] {
  if (!Array.isArray(value)) return [];
  return value.filter((g): g is Grade => typeof g === "object" && g !== null && typeof g.subject === "string" && typeof g.score === "number" && typeof g.outOf === "number");
}
