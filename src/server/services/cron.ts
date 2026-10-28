import "server-only";
import { db } from "@/lib/db";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { completeEndedTutorings } from "./tutoring";
import { notify } from "./notify";
import { syncTransaction } from "./payments";
import { fedapayConfigured } from "./fedapay";

const DAY_MS = 24 * 60 * 60 * 1000;

// Tâche quotidienne : clôtures, relances d'échéances, rapprochement des paiements en attente, purge.
export async function runDailyJobs(now = new Date()) {
  const completed = await completeEndedTutorings(now);

  // Relance 3 jours avant l'échéance, puis une fois en retard.
  const upcoming = await db.installment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: new Date(now.getTime() + 3 * DAY_MS) },
      OR: [{ remindedAt: null }, { remindedAt: { lt: db.installment.fields.dueDate } }],
    },
    include: { tutoring: { include: { child: true } } },
  });
  let reminders = 0;
  for (const inst of upcoming) {
    const overdue = inst.dueDate < now;
    if (inst.remindedAt && !overdue) continue;
    await notify({
      userId: inst.tutoring.parentId,
      type: overdue ? "installment.overdue" : "installment.due",
      title: overdue ? "Échéance en retard" : "Échéance à venir",
      body: `${formatFcfa(inst.amount)} pour ${fullName(inst.tutoring.child)}, ${overdue ? "à régler depuis le" : "à régler avant le"} ${formatDate(inst.dueDate)}.`,
      link: "/parent/paiements",
      email: true,
    });
    await db.installment.update({ where: { id: inst.id }, data: { remindedAt: now } });
    reminders++;
  }

  // Rattrapage des paiements dont le webhook aurait été perdu (transactions de moins de 7 jours).
  let synced = 0;
  if (fedapayConfigured()) {
    const pending = await db.payment.findMany({
      where: { status: "PENDING", createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS), lte: new Date(now.getTime() - 10 * 60 * 1000) } },
      select: { providerTransactionId: true },
    });
    for (const p of pending) {
      try {
        if ((await syncTransaction(p.providerTransactionId)) === "approved") synced++;
      } catch (err) {
        console.error("[cron] rapprochement", p.providerTransactionId, err);
      }
    }
  }

  const purged = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  return { completed, reminders, synced, purgedSessions: purged[0].count };
}
