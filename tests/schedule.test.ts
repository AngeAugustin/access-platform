import { describe, expect, it } from "vitest";
import { nextSession } from "@/lib/schedule";

// Lundi 2 novembre 2026 ; 10h00 UTC = 11h00 au Bénin.
const now = new Date("2026-11-02T10:00:00Z");
const period = { start: new Date("2026-10-01T00:00:00Z"), end: new Date("2026-12-31T00:00:00Z") };

describe("prochaine séance", () => {
  it("trouve le prochain créneau de la semaine", () => {
    const next = nextSession([{ day: "THURSDAY", slot: "S17_20" }, { day: "TUESDAY", slot: "S17_20" }], period, now);
    expect(next?.day).toBe("TUESDAY");
    expect(next?.when).toBe("Demain");
    expect(next?.start.toISOString()).toBe("2026-11-03T16:00:00.000Z");
  });

  it("garde la séance du jour tant qu'elle n'est pas finie", () => {
    const next = nextSession([{ day: "MONDAY", slot: "S08_11" }], period, new Date("2026-11-02T09:30:00Z"));
    expect(next?.when).toBe("Aujourd’hui");
    expect(nextSession([{ day: "MONDAY", slot: "S08_11" }], period, now)?.start.toISOString()).toBe("2026-11-09T07:00:00.000Z");
  });

  it("ne propose rien après la fin du tutorat", () => {
    const ended = { start: period.start, end: new Date("2026-11-02T00:00:00Z") };
    expect(nextSession([{ day: "WEDNESDAY", slot: "S14_17" }], ended, now)).toBeNull();
    expect(nextSession([], period, now)).toBeNull();
  });

  it("utilise l'heure du Bénin pour changer de jour", () => {
    // Dimanche 23h30 UTC = lundi 0h30 au Bénin.
    const next = nextSession([{ day: "MONDAY", slot: "S08_11" }], period, new Date("2026-11-01T23:30:00Z"));
    expect(next?.when).toBe("Aujourd’hui");
  });
});
