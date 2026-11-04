import { TIME_SLOTS, WEEKDAYS, type TimeSlotKey, type WeekdayKey } from "@/lib/constants";

// Prochaine séance d'un tutorat, déduite de ses créneaux hebdomadaires (heure du Bénin, UTC+1 sans heure d'été).

const OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEYS: WeekdayKey[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const SLOT_HOURS: Record<TimeSlotKey, [number, number]> = { S08_11: [8, 11], S11_14: [11, 14], S14_17: [14, 17], S17_20: [17, 20] };

export type Slot = { day: WeekdayKey; slot: TimeSlotKey };
export type NextSession = Slot & { start: Date; end: Date; when: string; hours: string };

// Une séance en cours compte encore comme la prochaine ; aucune avant le début ni après la fin du tutorat.
export function nextSession(slots: Slot[], period: { start: Date; end: Date }, now = new Date()): NextSession | null {
  if (slots.length === 0) return null;
  const local = now.getTime() + OFFSET_MS;
  const midnight = local - (local % DAY_MS); // minuit, heure du Bénin, exprimé en « temps local »
  const periodEnd = period.end.getTime() + DAY_MS; // la date de fin est incluse
  for (let offset = 0; offset < 8; offset++) {
    const dayStart = midnight + offset * DAY_MS;
    const day = DAY_KEYS[new Date(dayStart).getUTCDay()];
    const candidates = slots.filter((s) => s.day === day).sort((a, b) => SLOT_HOURS[a.slot][0] - SLOT_HOURS[b.slot][0]);
    for (const s of candidates) {
      const [from, to] = SLOT_HOURS[s.slot];
      const start = dayStart + from * 3600_000 - OFFSET_MS;
      const end = dayStart + to * 3600_000 - OFFSET_MS;
      if (end <= now.getTime() || start < period.start.getTime() - DAY_MS || start >= periodEnd) continue;
      const when = offset === 0 ? "Aujourd’hui" : offset === 1 ? "Demain" : WEEKDAYS[day];
      return { ...s, start: new Date(start), end: new Date(end), when, hours: TIME_SLOTS[s.slot] };
    }
  }
  return null;
}
