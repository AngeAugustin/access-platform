import { describe, expect, it } from "vitest";
import { addWeeks, amountForWeeks, planInstallments, planStop, splitCommission, weeksElapsed } from "@/lib/billing";

const rate = { hourlyRate: 1500, sessionsPerWeek: 2, hoursPerSession: 2 };
const start = new Date("2026-01-05T00:00:00Z");

describe("amountForWeeks", () => {
  it("multiplie heures × séances × semaines × tarif", () => {
    expect(amountForWeeks(rate, 4)).toBe(2 * 2 * 4 * 1500);
  });
});

describe("planInstallments", () => {
  it.each([
    [4, [4]],
    [3, [3]],
    [8, [4, 4]],
    [12, [4, 4, 4]],
    [16, [4, 4, 4, 4]],
    [10, [4, 4, 2]],
    [36, Array(9).fill(4)],
  ])("%i semaines → échéances %j", (weeks, expected) => {
    const plan = planInstallments(rate, weeks, start, 4);
    expect(plan.map((p) => p.weeks)).toEqual(expected);
    expect(plan.reduce((s, p) => s + p.amount, 0)).toBe(amountForWeeks(rate, weeks));
    expect(plan.map((p) => p.index)).toEqual(expected.map((_, i) => i + 1));
  });

  it("chaque échéance est due à la fin de la période couverte", () => {
    const plan = planInstallments(rate, 10, start, 4);
    expect(plan.map((p) => p.dueDate)).toEqual([addWeeks(start, 4), addWeeks(start, 8), addWeeks(start, 10)]);
  });

  it("refuse une durée nulle ou non entière", () => {
    expect(() => planInstallments(rate, 0, start, 4)).toThrow();
    expect(() => planInstallments(rate, 2.5, start, 4)).toThrow();
  });
});

describe("weeksElapsed", () => {
  it("compte les semaines entamées", () => {
    expect(weeksElapsed(start, start)).toBe(0);
    expect(weeksElapsed(start, new Date("2026-01-06T00:00:00Z"))).toBe(1);
    expect(weeksElapsed(start, addWeeks(start, 2))).toBe(2);
    expect(weeksElapsed(start, new Date("2026-01-20T00:00:00Z"))).toBe(3);
    expect(weeksElapsed(start, new Date("2025-12-01T00:00:00Z"))).toBe(0);
  });
});

describe("planStop", () => {
  const installments = [
    { id: "a", index: 1, weeks: 4, amount: amountForWeeks(rate, 4), status: "PAID" as const },
    { id: "b", index: 2, weeks: 4, amount: amountForWeeks(rate, 4), status: "PENDING" as const },
    { id: "c", index: 3, weeks: 4, amount: amountForWeeks(rate, 4), status: "PENDING" as const },
  ];

  it("facture la période en cours au prorata et annule les suivantes", () => {
    const stop = new Date("2026-02-09T12:00:00Z"); // semaine 6 entamée
    const changes = planStop(rate, installments, start, stop);
    expect(changes).toEqual([
      { id: "b", kind: "prorate", weeks: 2, amount: amountForWeeks(rate, 2), dueDate: stop },
      { id: "c", kind: "cancel" },
    ]);
  });

  it("signale un remboursement quand une période payée n'est pas consommée", () => {
    const stop = new Date("2026-01-12T12:00:00Z"); // 2 semaines entamées
    const changes = planStop(rate, installments, start, stop);
    expect(changes[0]).toEqual({ id: "a", kind: "refund-review", overpaidWeeks: 2, overpaidAmount: amountForWeeks(rate, 2) });
    expect(changes.slice(1).map((c) => c.kind)).toEqual(["cancel", "cancel"]);
  });

  it("arrêt avant le début : tout ce qui n'est pas payé est annulé", () => {
    const pendingOnly = installments.map((i) => ({ ...i, status: "PENDING" as const }));
    const changes = planStop(rate, pendingOnly, start, new Date("2026-01-01T00:00:00Z"));
    expect(changes.every((c) => c.kind === "cancel")).toBe(true);
  });

  it("ignore les échéances déjà annulées et les périodes terminées", () => {
    const stop = addWeeks(start, 9);
    const changes = planStop(rate, installments, start, stop);
    expect(changes).toEqual([{ id: "c", kind: "prorate", weeks: 1, amount: amountForWeeks(rate, 1), dueDate: stop }]);
  });
});

describe("splitCommission", () => {
  it("arrondit la commission et garde le total", () => {
    const s = splitCommission(24001, 15);
    expect(s.commissionAmount).toBe(3600);
    expect(s.netAmount + s.commissionAmount).toBe(24001);
  });
  it("refuse un pourcentage hors bornes", () => {
    expect(() => splitCommission(1000, 120)).toThrow();
  });
});
