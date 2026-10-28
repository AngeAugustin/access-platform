// Règles de calcul financier, sans accès à la base : testées dans billing.test.ts.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export type Rate = {
  hourlyRate: number;
  sessionsPerWeek: number;
  hoursPerSession: number;
};

export type PlannedInstallment = {
  index: number;
  fromWeek: number;
  weeks: number;
  amount: number;
  dueDate: Date;
};

export function amountForWeeks(rate: Rate, weeks: number): number {
  return rate.hoursPerSession * rate.sessionsPerWeek * weeks * rate.hourlyRate;
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * WEEK_MS);
}

// Découpe un tutorat en échéances de `weeksPerInstallment` semaines (la dernière peut être plus courte).
// Chaque échéance est exigible à la fin de la période qu'elle couvre. Le nombre d'échéances n'est pas plafonné.
export function planInstallments(
  rate: Rate,
  durationWeeks: number,
  startDate: Date,
  weeksPerInstallment: number,
): PlannedInstallment[] {
  if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
    throw new Error("La durée doit être un nombre entier de semaines, au moins 1.");
  }
  if (!Number.isInteger(weeksPerInstallment) || weeksPerInstallment < 1) {
    throw new Error("La période de facturation doit être d'au moins 1 semaine.");
  }
  const plan: PlannedInstallment[] = [];
  let fromWeek = 0;
  let index = 1;
  while (fromWeek < durationWeeks) {
    const weeks = Math.min(weeksPerInstallment, durationWeeks - fromWeek);
    plan.push({
      index,
      fromWeek,
      weeks,
      amount: amountForWeeks(rate, weeks),
      dueDate: addWeeks(startDate, fromWeek + weeks),
    });
    fromWeek += weeks;
    index += 1;
  }
  return plan;
}

// Nombre de semaines entamées entre le début du tutorat et la date d'arrêt.
export function weeksElapsed(startDate: Date, stopDate: Date): number {
  const diff = stopDate.getTime() - startDate.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / WEEK_MS);
}

export type ExistingInstallment = {
  id: string;
  index: number;
  weeks: number;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELLED";
};

export type StopChange =
  | { id: string; kind: "prorate"; weeks: number; amount: number; dueDate: Date }
  | { id: string; kind: "cancel" }
  | { id: string; kind: "refund-review"; overpaidWeeks: number; overpaidAmount: number };

// Arrêt anticipé : la période en cours est facturée au prorata des semaines entamées,
// les périodes suivantes non payées sont annulées. Une période déjà payée mais non consommée
// est signalée pour remboursement (traitement manuel par l'administration).
export function planStop(
  rate: Rate,
  installments: ExistingInstallment[],
  startDate: Date,
  stopDate: Date,
): StopChange[] {
  const elapsed = weeksElapsed(startDate, stopDate);
  const ordered = [...installments].sort((a, b) => a.index - b.index);
  const changes: StopChange[] = [];
  let fromWeek = 0;
  for (const inst of ordered) {
    const toWeek = fromWeek + inst.weeks;
    if (inst.status !== "CANCELLED" && toWeek > elapsed) {
      const usedWeeks = Math.max(0, elapsed - fromWeek);
      if (inst.status === "PENDING") {
        if (usedWeeks === 0) {
          changes.push({ id: inst.id, kind: "cancel" });
        } else {
          changes.push({
            id: inst.id,
            kind: "prorate",
            weeks: usedWeeks,
            amount: amountForWeeks(rate, usedWeeks),
            dueDate: stopDate,
          });
        }
      } else if (inst.status === "PAID") {
        const overpaidWeeks = inst.weeks - usedWeeks;
        changes.push({
          id: inst.id,
          kind: "refund-review",
          overpaidWeeks,
          overpaidAmount: amountForWeeks(rate, overpaidWeeks),
        });
      }
    }
    fromWeek = toWeek;
  }
  return changes;
}

export function splitCommission(grossAmount: number, commissionPercent: number) {
  if (commissionPercent < 0 || commissionPercent > 100) {
    throw new Error("La commission doit être comprise entre 0 et 100 %.");
  }
  const commissionAmount = Math.round((grossAmount * commissionPercent) / 100);
  return { grossAmount, commissionAmount, netAmount: grossAmount - commissionAmount };
}
