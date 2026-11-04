import "server-only";
import { db } from "@/lib/db";
import { splitCommission } from "@/lib/billing";
import { formatFcfa, fullName } from "@/lib/format";
import { audit } from "@/lib/audit";
import { BusinessError } from "./tutoring";
import { type FedapayTransaction, createAndStartPayout, createTransaction, getPayout, getTransaction, payoutModeFor } from "./fedapay";
import { payoutOutcome } from "@/lib/payout-status";
import { getSettings } from "./settings";
import { notify, notifyAdmins } from "./notify";

// Un lien de paiement FedaPay encore ouvert est réutilisé pendant ce délai plutôt que d'en créer un nouveau.
const REUSE_WINDOW_MS = 30 * 60 * 1000;

// Lance le paiement d'une échéance et renvoie l'URL de paiement FedaPay.
// La tentative est enregistrée avant l'appel : si FedaPay échoue, elle passe en échec avec la raison ;
// si le webhook arrive avant la fin de l'enregistrement, l'identifiant de tentative des métadonnées suffit à la retrouver.
export async function startInstallmentPayment(installmentId: string, parentId: string): Promise<string> {
  const installment = await db.installment.findFirst({
    where: { id: installmentId, tutoring: { parentId } },
    include: { tutoring: { include: { child: true } } },
  });
  if (!installment) throw new BusinessError("Échéance introuvable.");
  if (installment.status !== "PENDING") throw new BusinessError("Cette échéance n'est plus à payer.");
  if (installment.amount <= 0) throw new BusinessError("Montant invalide.");

  // Double clic, retour arrière ou nouvel onglet : le lien déjà ouvert est resynchronisé puis réutilisé.
  const open = await db.payment.findFirst({
    where: {
      installmentId: installment.id,
      payerId: parentId,
      status: "PENDING",
      amount: installment.amount,
      providerTransactionId: { not: null },
      paymentUrl: { not: null },
      createdAt: { gte: new Date(Date.now() - REUSE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (open?.providerTransactionId && open.paymentUrl) {
    const state = await syncTransaction(open.providerTransactionId).catch(() => "pending" as const);
    if (state === "approved" || state === "already") throw new BusinessError("Cette échéance vient d'être payée.");
    if (state === "pending") return open.paymentUrl;
  }

  const parent = await db.user.findUniqueOrThrow({ where: { id: parentId } });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const payment = await db.payment.create({
    data: { installmentId: installment.id, payerId: parentId, amount: installment.amount },
  });
  let tx: { id: number; url: string };
  try {
    tx = await createTransaction({
      amount: installment.amount,
      description: `Access ${installment.reference} — ${fullName(installment.tutoring.child)}`,
      callbackUrl: `${appUrl}/parent/paiements/retour`,
      customer: { firstname: parent.firstName, lastname: parent.lastName, email: parent.email, phone: parent.phone },
      metadata: { paymentId: payment.id, installmentId: installment.id, reference: installment.reference },
    });
  } catch (err) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", statusReason: (err instanceof Error ? err.message : "Erreur inconnue").slice(0, 300) },
    });
    throw err;
  }
  // Le webhook a pu rattacher la transaction entre-temps : on ne touche qu'à une tentative encore sans transaction.
  await db.payment.updateMany({
    where: { id: payment.id, providerTransactionId: null },
    data: { providerTransactionId: String(tx.id), paymentUrl: tx.url },
  });
  await audit(parentId, "payment.start", "Installment", installment.id, { transactionId: tx.id });
  return tx.url;
}

// Retrouve la tentative d'une transaction. Si le lien n'est pas encore enregistré (webhook arrivé avant la fin
// de l'initialisation), on le rétablit grâce à l'identifiant de tentative transmis dans les métadonnées FedaPay.
async function paymentForTransaction(transactionId: string, remote?: FedapayTransaction) {
  const include = { installment: { include: { tutoring: { include: { child: true, educator: true } } } } } as const;
  const linked = await db.payment.findUnique({ where: { providerTransactionId: transactionId }, include });
  if (linked) return { payment: linked, remote };
  const fetched = remote ?? (await getTransaction(transactionId));
  const paymentId = fetched.custom_metadata?.paymentId;
  if (typeof paymentId !== "string" || paymentId.length > 40) return { payment: null, remote: fetched };
  const attached = await db.payment.updateMany({ where: { id: paymentId, providerTransactionId: null }, data: { providerTransactionId: transactionId } });
  if (attached.count === 0) return { payment: null, remote: fetched };
  return { payment: await db.payment.findUnique({ where: { id: paymentId }, include }), remote: fetched };
}

export type SyncResult = "approved" | "already" | "declined" | "pending" | "unknown" | "mismatch";

// Rapproche une transaction FedaPay avec la base. Idempotent : peut être appelé par le webhook,
// par la page de retour et par la tâche quotidienne sans risque de double comptabilisation.
export async function syncTransaction(transactionId: string): Promise<SyncResult> {
  const found = await paymentForTransaction(transactionId);
  const payment = found.payment;
  if (!payment) return "unknown";
  if (payment.status === "APPROVED") return "already";

  const remote = found.remote ?? (await getTransaction(transactionId));

  if (remote.status === "declined" || remote.status === "canceled") {
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: remote.status === "declined" ? "DECLINED" : "CANCELLED" },
    });
    return "declined";
  }
  if (remote.status !== "approved" && remote.status !== "transferred") return "pending";

  const { installment } = payment;
  if (remote.amount !== installment.amount || payment.amount !== installment.amount) {
    // Signalée une seule fois : les rapprochements suivants ne renotifient pas les administrateurs.
    const flagged = await db.payment.updateMany({
      where: { id: payment.id, anomaly: null },
      data: { anomaly: "AMOUNT_MISMATCH", statusReason: `Montant payé ${formatFcfa(remote.amount)}, attendu ${formatFcfa(installment.amount)}.` },
    });
    if (flagged.count === 0) return "mismatch";
    await audit(null, "payment.amount_mismatch", "Payment", payment.id, {
      expected: installment.amount,
      paid: remote.amount,
      transactionId,
    });
    await notifyAdmins({
      type: "payment.mismatch",
      title: "Paiement à vérifier",
      body: `La transaction ${transactionId} (${formatFcfa(remote.amount)}) ne correspond pas au montant de l'échéance ${installment.reference} (${formatFcfa(installment.amount)}).`,
      link: `/admin/paiements?onglet=anomalies`,
    });
    return "mismatch";
  }

  const settings = await getSettings();
  const split = splitCommission(installment.amount, settings.commissionPercent);
  const outcome = await db.$transaction(async (tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    if (updated.count === 0) return "already" as const;
    const paid = await tx.installment.updateMany({
      where: { id: installment.id, status: "PENDING" },
      data: { status: "PAID", paidAt: new Date() },
    });
    // Échéance déjà réglée par une autre transaction : double paiement à rembourser.
    if (paid.count === 0) {
      await tx.payment.update({ where: { id: payment.id }, data: { anomaly: "DUPLICATE" } });
      return "duplicate" as const;
    }
    await tx.payout.create({
      data: { installmentId: installment.id, educatorId: installment.tutoring.educatorId, ...split },
    });
    return "paid" as const;
  });
  if (outcome === "already") return "already";
  if (outcome === "duplicate") {
    await audit(payment.payerId, "payment.duplicate", "Payment", payment.id, { transactionId });
    await notifyAdmins({
      type: "payment.duplicate",
      title: "Double paiement",
      body: `L'échéance ${installment.reference} a été payée deux fois (transaction ${transactionId}). Un remboursement est à prévoir.`,
      link: `/admin/paiements?onglet=anomalies`,
    });
    return "already";
  }

  await audit(payment.payerId, "payment.approved", "Payment", payment.id, { transactionId });
  const child = fullName(installment.tutoring.child);
  await notify({
    userId: payment.payerId,
    type: "payment.approved",
    title: "Paiement reçu",
    body: `Votre paiement de ${formatFcfa(installment.amount)} pour ${child} (échéance ${installment.index}) est confirmé.`,
    link: `/parent/paiements`,
    email: true,
  });
  await notify({
    userId: installment.tutoring.educator.userId,
    type: "payment.received",
    title: "Échéance réglée",
    body: `Le parent de ${child} a réglé l'échéance ${installment.index}. Votre reversement de ${formatFcfa(split.netAmount)} est en préparation.`,
    link: `/educateur/paiements`,
  });
  return "approved";
}

// Reversement automatique via FedaPay vers le numéro Mobile Money de l'éducateur.
// Le reversement reste « en cours » jusqu'à ce que FedaPay confirme l'envoi (webhook, vérification
// manuelle ou rapprochement quotidien) : un lancement accepté ne garantit pas que les fonds sont arrivés.
export async function executeFedapayPayout(payoutId: string, adminId: string) {
  const payout = await db.payout.findUnique({
    where: { id: payoutId },
    include: { educator: { include: { user: true } } },
  });
  if (!payout) throw new BusinessError("Reversement introuvable.");
  if (payout.status !== "PENDING" && payout.status !== "FAILED") throw new BusinessError("Ce reversement est déjà traité.");
  const phone = payout.educator.payoutPhone;
  if (!phone) throw new BusinessError("L'éducateur n'a pas renseigné de numéro Mobile Money.");

  // Avant de relancer un reversement en échec, on s'assure que la tentative précédente n'a pas
  // finalement abouti : sinon l'éducateur serait payé deux fois.
  if (payout.status === "FAILED" && payout.method === "FEDAPAY" && payout.providerReference) {
    const previous = await getPayout(payout.providerReference).catch(() => {
      throw new BusinessError("Impossible de vérifier la tentative précédente auprès de FedaPay. Réessayez plus tard.");
    });
    if (payoutOutcome(previous.status) !== "FAILED") {
      await db.payout.update({ where: { id: payoutId }, data: { status: "PROCESSING", failureReason: null } });
      await syncPayout(payout.providerReference);
      throw new BusinessError("La tentative précédente est finalement en cours ou aboutie chez FedaPay : pas de nouvel envoi.");
    }
  }

  const locked = await db.payout.updateMany({
    where: { id: payoutId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING", method: "FEDAPAY", executedById: adminId, failureReason: null, providerReference: null, startedAt: new Date() },
  });
  if (locked.count === 0) throw new BusinessError("Ce reversement est déjà en cours.");

  let providerId: number;
  try {
    const { user } = payout.educator;
    const result = await createAndStartPayout({
      amount: payout.netAmount,
      mode: payoutModeFor(payout.educator.payoutOperator),
      customer: { firstname: user.firstName, lastname: user.lastName, email: user.email, phone },
    });
    providerId = result.id;
  } catch (err) {
    await db.payout.update({
      where: { id: payoutId },
      data: { status: "FAILED", failureReason: err instanceof Error ? err.message.slice(0, 300) : "Erreur inconnue" },
    });
    throw new BusinessError(err instanceof Error ? err.message : "Échec du reversement.");
  }
  await db.payout.update({ where: { id: payoutId }, data: { providerReference: String(providerId) } });
  await audit(adminId, "payout.fedapay_started", "Payout", payoutId, { providerId });
  await notify({
    userId: payout.educator.userId,
    type: "payout.started",
    title: "Reversement en cours",
    body: `${formatFcfa(payout.netAmount)} sont en cours d'envoi sur votre numéro Mobile Money.`,
    link: `/educateur/paiements`,
  });
  // FedaPay peut confirmer immédiatement : on vérifie une première fois sans attendre le webhook.
  await syncPayout(String(providerId)).catch((err) => console.error("[payout] vérification immédiate", err));
}

export type PayoutSyncResult = "done" | "failed" | "processing" | "unknown" | "already";

// Rapproche un reversement FedaPay avec la base. Idempotent : webhook, bouton « Vérifier » et tâche
// quotidienne peuvent l'appeler sans risque, seule la première transition est appliquée et notifiée.
export async function syncPayout(providerId: string): Promise<PayoutSyncResult> {
  const payout = await db.payout.findFirst({
    where: { providerReference: providerId, method: "FEDAPAY" },
    include: { educator: true, installment: { include: { tutoring: { include: { child: true } } } } },
  });
  if (!payout) return "unknown";
  if (payout.status !== "PROCESSING") return "already";

  const remote = await getPayout(providerId);
  const outcome = payoutOutcome(remote.status);
  if (outcome === "PROCESSING") return "processing";

  const updated = await db.payout.updateMany({
    where: { id: payout.id, status: "PROCESSING", providerReference: providerId },
    data:
      outcome === "DONE"
        ? { status: "DONE", executedAt: new Date() }
        : { status: "FAILED", failureReason: `FedaPay : ${remote.status}${remote.last_error_code ? ` (${remote.last_error_code})` : ""}`.slice(0, 300) },
  });
  if (updated.count === 0) return "already";

  if (outcome === "DONE") {
    await audit(null, "payout.confirmed", "Payout", payout.id, { providerId });
    await notify({
      userId: payout.educator.userId,
      type: "payout.done",
      title: "Reversement effectué",
      body: `${formatFcfa(payout.netAmount)} ont été envoyés sur votre numéro Mobile Money.`,
      link: `/educateur/paiements`,
      email: true,
    });
    return "done";
  }
  await audit(null, "payout.failed", "Payout", payout.id, { providerId, status: remote.status });
  await notifyAdmins({
    type: "payout.failed",
    title: "Reversement en échec",
    body: `Le reversement de ${formatFcfa(payout.netAmount)} pour ${fullName(payout.installment.tutoring.child)} a échoué chez FedaPay (${remote.status}). Vérifiez le numéro Mobile Money puis relancez-le.`,
    link: `/admin/paiements`,
    email: true,
  });
  return "failed";
}

// Reversement fait hors plateforme (virement, espèces) : l'administrateur saisit la référence.
export async function recordManualPayout(payoutId: string, adminId: string, providerReference: string) {
  const updated = await db.payout.updateMany({
    where: { id: payoutId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "DONE", method: "MANUAL", providerReference, executedById: adminId, executedAt: new Date() },
  });
  if (updated.count === 0) throw new BusinessError("Ce reversement est déjà traité.");
  const payout = await db.payout.findUniqueOrThrow({ where: { id: payoutId }, include: { educator: true } });
  await audit(adminId, "payout.manual", "Payout", payoutId, { providerReference });
  await notify({
    userId: payout.educator.userId,
    type: "payout.done",
    title: "Reversement effectué",
    body: `Un reversement de ${formatFcfa(payout.netAmount)} a été enregistré (réf. ${providerReference}).`,
    link: `/educateur/paiements`,
    email: true,
  });
}
