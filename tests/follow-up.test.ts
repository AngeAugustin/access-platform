import { describe, expect, it } from "vitest";
import { dueAtFor, followUpPrice, localDate, occurrenceDates, occurrenceState, readGrades, recurrenceLabel, tutorShare } from "@/lib/follow-up";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("suivi", () => {
  it("calcule le forfait mensuel selon le nombre d'enfants", () => {
    const grid = { followUpFirstChild: 15000, followUpExtraChild: 10000 };
    expect(followUpPrice(0, grid)).toBe(0);
    expect(followUpPrice(1, grid)).toBe(15000);
    expect(followUpPrice(3, grid)).toBe(35000);
    expect(tutorShare(25000, 20)).toBe(20000);
  });

  it("donne la date du jour au Bénin", () => {
    // 23 h 30 UTC = 0 h 30 le lendemain à Cotonou.
    expect(localDate(new Date("2026-11-09T23:30:00Z")).toISOString()).toBe("2026-11-10T00:00:00.000Z");
    expect(localDate(new Date("2026-11-09T22:30:00Z")).toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("place l'heure limite à l'heure du Bénin", () => {
    expect(dueAtFor(d("2026-11-09"), 21).toISOString()).toBe("2026-11-09T20:00:00.000Z");
  });

  it("répète une action les jours choisis", () => {
    // Lundi 9 novembre 2026.
    const dates = occurrenceDates({ days: ["MONDAY", "THURSDAY"], intervalWeeks: 1 }, d("2026-11-09"), d("2026-11-09"), d("2026-11-22"));
    expect(dates.map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-11-09", "2026-11-12", "2026-11-16", "2026-11-19"]);
  });

  it("compte les semaines à partir du début du suivi", () => {
    // Début un mercredi : la semaine du début compte, puis une semaine sur deux.
    const dates = occurrenceDates({ days: ["FRIDAY"], intervalWeeks: 2 }, d("2026-11-11"), d("2026-11-11"), d("2026-12-10"));
    expect(dates.map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-11-13", "2026-11-27"]);
  });

  it("ne crée rien avant le début du suivi", () => {
    const dates = occurrenceDates({ days: ["MONDAY"], intervalWeeks: 1 }, d("2026-11-11"), d("2026-11-01"), d("2026-11-17"));
    expect(dates.map((x) => x.toISOString().slice(0, 10))).toEqual(["2026-11-16"]);
  });

  it("distingue à faire, en retard et manqué", () => {
    const dueAt = new Date("2026-11-09T20:00:00Z");
    expect(occurrenceState({ status: "PENDING", dueAt }, new Date("2026-11-09T19:00:00Z"))).toBe("todo");
    expect(occurrenceState({ status: "PENDING", dueAt }, new Date("2026-11-10T07:00:00Z"))).toBe("late");
    expect(occurrenceState({ status: "PENDING", dueAt }, new Date("2026-11-10T12:00:00Z"))).toBe("missed");
    expect(occurrenceState({ status: "DONE", dueAt }, new Date("2026-11-12T12:00:00Z"))).toBe("DONE");
  });

  it("décrit la récurrence", () => {
    expect(recurrenceLabel({ days: ["THURSDAY", "MONDAY"], intervalWeeks: 1, dueHour: 21 })).toBe("lun. jeu. · avant 21 h");
    expect(recurrenceLabel({ days: ["FRIDAY"], intervalWeeks: 2, dueHour: 17 })).toBe("ven. · toutes les 2 semaines · avant 17 h");
  });

  it("ignore les notes mal formées", () => {
    expect(readGrades([{ subject: "Maths", score: 14, outOf: 20 }, { subject: "x" }, null, "a"])).toEqual([{ subject: "Maths", score: 14, outOf: 20 }]);
    expect(readGrades(null)).toEqual([]);
  });
});
