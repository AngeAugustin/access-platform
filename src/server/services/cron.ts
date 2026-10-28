import "server-only";
import { db } from "@/lib/db";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { completeEndedTutorings } from "./tutoring";
import { notify } from "./notify";
import { syncPayout, syncTransaction } from "./payments";
import { notifyAdmins } from "./notify";
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

  // Reversements lancés mais non confirmés : rapprochement, puis alerte au-delà de 24 heures.
  let payoutsConfirmed = 0;
  let payoutsStuck = 0;
  if (fedapayConfigured()) {
    const processing = await db.payout.findMany({
      where: { status: "PROCESSING", method: "FEDAPAY", providerReference: { not: null }, startedAt: { lte: new Date(now.getTime() - 5 * 60 * 1000) } },
      select: { providerReference: true, startedAt: true },
    });
    for (const p of processing) {
      try {
        const result = await syncPayout(p.providerReference!);
        if (result === "done" || result === "failed") payoutsConfirmed++;
        else if (result === "processing" && p.startedAt && now.getTime() - p.startedAt.getTime() > DAY_MS) payoutsStuck++;
      } catch (err) {
        console.error("[cron] reversement", p.providerReference, err);
      }
    }
    if (payoutsStuck > 0) {
      await notifyAdmins({
        type: "payout.stuck",
        title: "Reversements non confirmés",
        body: `${payoutsStuck} reversement(s) FedaPay sont en cours depuis plus de 24 heures. Vérifiez-les dans le tableau de bord FedaPay.`,
        link: "/admin/paiements",
        email: true,
      });
    }
  }

  const purged = await db.$transaction([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  return { completed, reminders, synced, payoutsConfirmed, payoutsStuck, purgedSessions: purged[0].count };
}
