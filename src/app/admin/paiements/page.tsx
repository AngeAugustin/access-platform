import Link from "next/link";
import { CalendarX, CircleCheck, HandCoins, History, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName, payoutAccount } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { Badge, Card, EmptyState, PageHeader, Stat, Table, Tabs, Td } from "@/components/ui";
import { PayoutBadge } from "@/components/status";
import { Pagination } from "@/components/ui/pagination";
import { pageSlice, paginate } from "@/lib/pagination";
import { CheckPaymentForm, CheckPayoutForm, PayoutForms, ResolveAnomalyForm } from "@/components/admin/forms";

export const metadata = { title: "Paiements" };

const TABS = ["reversements", "retards", "anomalies", "encaissements", "historique"] as const;
type Tab = (typeof TABS)[number];

const HOUR_MS = 60 * 60 * 1000;
// Au-delà de ce délai, un paiement ou un reversement encore « en cours » chez FedaPay est jugé anormal.
const STUCK_AFTER_MS = 24 * HOUR_MS;
// Les échecs d'initialisation FedaPay restent visibles pendant ce délai.
const FAILED_WINDOW_MS = 7 * 24 * HOUR_MS;

type Anomaly = {
  key: string;
  date: Date;
  kind: ReactNode;
  who: ReactNode;
  subject: string;
  amount: number;
  detail: ReactNode;
  action: ReactNode;
};

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ onglet?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const { onglet, page } = await searchParams;
  const tab: Tab = TABS.find((t) => t === onglet) ?? "reversements";
  const now = new Date();
  const [paidCount, doneCount, paidSum] = await Promise.all([
    db.payment.count({ where: { status: "APPROVED" } }),
    db.payout.count({ where: { status: "DONE" } }),
    db.payment.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
  ]);
  // Le numéro de page ne vaut que pour l'onglet ouvert : les liens d'onglets repartent de la page 1.
  const paymentsPage = paginate(paidCount, page);
  const payoutsPage = paginate(doneCount, page);
  const paymentInclude = { payer: true, installment: { include: { tutoring: { include: { child: true } } } } } as const;
  const [toPay, recentPayouts, payments, overdue, flagged, stuckPayments, failedPayments, refunds] = await Promise.all([
    db.payout.findMany({
      where: { status: { in: ["PENDING", "FAILED", "PROCESSING"] } },
      include: { educator: { include: { user: true } }, installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.payout.findMany({
      where: { status: "DONE" },
      include: { educator: { include: { user: true } }, executedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { executedAt: "desc" },
      skip: payoutsPage.skip,
      take: payoutsPage.take,
    }),
    db.payment.findMany({
      where: { status: "APPROVED" },
      include: { payer: true, installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { approvedAt: "desc" },
      skip: paymentsPage.skip,
      take: paymentsPage.take,
    }),
    db.installment.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      include: { tutoring: { include: { child: true, parent: true } } },
      orderBy: { dueDate: "asc" },
    }),
    db.payment.findMany({
      where: { anomaly: { not: null }, anomalyResolvedAt: null },
      include: paymentInclude,
      orderBy: { updatedAt: "desc" },
    }),
    db.payment.findMany({
      where: { status: "PENDING", anomaly: null, providerTransactionId: { not: null }, createdAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
      include: paymentInclude,
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.payment.findMany({
      where: { status: "FAILED", createdAt: { gte: new Date(now.getTime() - FAILED_WINDOW_MS) } },
      include: paymentInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.installment.findMany({
      where: { refundAmount: { gt: 0 }, refundedAt: null },
      include: { payout: true, tutoring: { include: { child: true, parent: true } } },
      orderBy: { updatedAt: "asc" },
    }),
  ]);
  const fedapay = fedapayConfigured();
  const stuckPayouts = toPay.filter((p) => p.status === "PROCESSING" && p.startedAt && now.getTime() - p.startedAt.getTime() > STUCK_AFTER_MS);

  const anomalies: Anomaly[] = [
    ...flagged.map((p) => ({
      key: p.id,
      date: p.updatedAt,
      kind: p.anomaly === "DUPLICATE" ? <Badge tone="red">Double paiement</Badge> : <Badge tone="red">Montant incohérent</Badge>,
      who: fullName(p.payer),
      subject: `${fullName(p.installment.tutoring.child)} · ${p.installment.reference}`,
      amount: p.amount,
      detail: (
        <>
          {p.anomaly === "DUPLICATE" ? "Échéance déjà réglée par une autre transaction : remboursement à prévoir." : p.statusReason}
          <span className="block font-mono text-xs text-slate-500">Transaction {p.providerTransactionId}</span>
        </>
      ),
      action: <ResolveAnomalyForm paymentId={p.id} />,
    })),
    ...refunds.map((i) => {
      const refund = i.refundAmount ?? 0;
      // Reversement déjà parti au montant plein : l'éducateur a reçu la part des semaines non effectuées.
      const overpaid = i.payout && i.payout.grossAmount > i.amount - refund && (i.payout.status === "DONE" || i.payout.status === "PROCESSING");
      return {
        key: i.id,
        date: i.tutoring.stoppedAt ?? i.updatedAt,
        kind: <Badge tone="red">Remboursement à faire</Badge>,
        who: (
          <>
            <Link href={`/admin/parents/${i.tutoring.parentId}`} className="font-medium text-brand-700 hover:text-brand-800">
              {fullName(i.tutoring.parent)}
            </Link>
            <span className="block text-xs text-slate-500">{i.tutoring.parent.phone}</span>
          </>
        ),
        subject: `${fullName(i.tutoring.child)} · ${i.reference}`,
        amount: refund,
        detail: (
          <>
            Accompagnement arrêté : semaines payées mais non effectuées.
            {overpaid && (
              <span className="block text-rose-700">
                Le reversement à l&apos;éducateur est {i.payout?.status === "DONE" ? "déjà parti" : "en cours"} au montant plein ({formatFcfa(i.payout?.netAmount ?? 0)}) : la part non due est à récupérer.
              </span>
            )}
          </>
        ),
        action: <ResolveAnomalyForm installmentId={i.id} />,
      };
    }),
    ...stuckPayments.map((p) => ({
      key: p.id,
      date: p.createdAt,
      kind: <Badge tone="amber">Paiement sans réponse</Badge>,
      who: fullName(p.payer),
      subject: `${fullName(p.installment.tutoring.child)} · ${p.installment.reference}`,
      amount: p.amount,
      detail: (
        <>
          Toujours en attente chez FedaPay depuis le {formatDateTime(p.createdAt)}.
          <span className="block font-mono text-xs text-slate-500">Transaction {p.providerTransactionId}</span>
        </>
      ),
      action: fedapay ? <CheckPaymentForm paymentId={p.id} /> : null,
    })),
    ...stuckPayouts.map((p) => ({
      key: p.id,
      date: p.startedAt ?? p.createdAt,
      kind: <Badge tone="amber">Reversement bloqué</Badge>,
      who: fullName(p.educator.user),
      subject: `${fullName(p.installment.tutoring.child)} · n°${p.installment.index}`,
      amount: p.netAmount,
      detail: `Lancé le ${formatDateTime(p.startedAt)}, sans confirmation de FedaPay.`,
      action: p.providerReference ? <CheckPayoutForm payoutId={p.id} /> : null,
    })),
    ...failedPayments.map((p) => ({
      key: p.id,
      date: p.createdAt,
      kind: <Badge tone="gray">Échec d&apos;initialisation</Badge>,
      who: fullName(p.payer),
      subject: `${fullName(p.installment.tutoring.child)} · ${p.installment.reference}`,
      amount: p.amount,
      detail: p.statusReason ?? "Erreur inconnue.",
      action: null,
    })),
  ];

  const toPayPage = pageSlice(toPay, page);
  const overduePage = pageSlice(overdue, page);
  const anomaliesPage = pageSlice(anomalies, page);
  const pagination = { path: "/admin/paiements", params: { onglet: tab === "reversements" ? undefined : tab } };

  return (
    <>
      <PageHeader title="Paiements" subtitle="Encaissements des familles et reversements aux éducateurs." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1">
        <Stat label="Reversements à effectuer" value={formatFcfa(toPay.reduce((s, p) => s + p.netAmount, 0))} hint={`${toPay.length} reversement(s)`} icon={HandCoins} />
        <Stat label="Échéances en retard" value={formatFcfa(overdue.reduce((s, i) => s + i.amount, 0))} hint={`${overdue.length} échéance(s)`} icon={CalendarX} tone={overdue.length ? "rose" : "slate"} />
        <Stat label="Encaissé au total" value={formatFcfa(paidSum._sum.amount ?? 0)} hint={`${paidCount} paiement(s) confirmé(s)`} icon={Wallet} tone="green" />
      </div>

      <Tabs
        label="Paiements"
        current={tab}
        items={[
          { key: "reversements", href: "/admin/paiements", label: "Reversements à effectuer", count: toPay.length },
          { key: "retards", href: "/admin/paiements?onglet=retards", label: "Échéances en retard", count: overdue.length },
          { key: "anomalies", href: "/admin/paiements?onglet=anomalies", label: "Anomalies", count: anomalies.length },
          { key: "encaissements", href: "/admin/paiements?onglet=encaissements", label: "Encaissements" },
          { key: "historique", href: "/admin/paiements?onglet=historique", label: "Reversements effectués" },
        ]}
      />

      {tab === "reversements" && (
        <Card title="Reversements aux éducateurs">
          {toPay.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Aucun reversement en attente" />
          ) : (
            <Table bare head={["Éducateur", "Élève · échéance", "Payé", "Commission", "À reverser", "Mobile Money", "Statut", "Action"]}>
              {toPayPage.items.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <Link href={`/admin/educateurs/${p.educatorId}`} className="font-medium text-brand-700 hover:text-brand-800">
                      {fullName(p.educator.user)}
                    </Link>
                  </Td>
                  <Td>
                    {fullName(p.installment.tutoring.child)} · n°{p.installment.index}
                  </Td>
                  <Td className="whitespace-nowrap">{formatFcfa(p.grossAmount)}</Td>
                  <Td className="whitespace-nowrap">{formatFcfa(p.commissionAmount)}</Td>
                  <Td className="whitespace-nowrap font-semibold">{formatFcfa(p.netAmount)}</Td>
                  <Td>{payoutAccount(p.educator) ?? "-"}</Td>
                  <Td>
                    <PayoutBadge status={p.status} />
                    {p.failureReason && <span className="block text-xs text-rose-700">{p.failureReason}</span>}
                  </Td>
                  <Td>
                    {p.status === "PROCESSING" ? (
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">Lancé le {formatDateTime(p.startedAt)}</p>
                        {p.providerReference && <CheckPayoutForm payoutId={p.id} />}
                      </div>
                    ) : (
                      <PayoutForms payoutId={p.id} fedapay={fedapay} />
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination info={toPayPage.info} {...pagination} label="reversement" />
        </Card>
      )}

      {tab === "retards" && (
        <Card title="Échéances en retard">
          {overdue.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Aucune échéance en retard" />
          ) : (
            <Table bare head={["Parent", "Élève", "Montant", "Date limite", "Relancé le"]}>
              {overduePage.items.map((i) => (
                <tr key={i.id}>
                  <Td>
                    <Link href={`/admin/parents/${i.tutoring.parentId}`} className="font-medium text-brand-700 hover:text-brand-800">
                      {fullName(i.tutoring.parent)}
                    </Link>
                    <span className="block text-xs text-slate-500">{i.tutoring.parent.phone}</span>
                  </Td>
                  <Td>{fullName(i.tutoring.child)}</Td>
                  <Td className="whitespace-nowrap">{formatFcfa(i.amount)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(i.dueDate)}</Td>
                  <Td className="whitespace-nowrap">{formatDate(i.remindedAt)}</Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination info={overduePage.info} {...pagination} label="échéance" />
        </Card>
      )}

      {tab === "anomalies" && (
        <Card
          title="Anomalies de paiement"
          description="Montants incohérents, doubles paiements et remboursements dus après un arrêt d'accompagnement, paiements ou reversements restés sans réponse de FedaPay plus de 24 h, échecs d'initialisation des 7 derniers jours."
        >
          {anomalies.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Aucune anomalie" />
          ) : (
            <Table bare head={["Date", "Type", "Concerné", "Élève · échéance", "Montant", "Détail", "Action"]}>
              {anomaliesPage.items.map((a) => (
                <tr key={a.key}>
                  <Td className="whitespace-nowrap">{formatDateTime(a.date)}</Td>
                  <Td>{a.kind}</Td>
                  <Td>{a.who}</Td>
                  <Td>{a.subject}</Td>
                  <Td className="whitespace-nowrap">{formatFcfa(a.amount)}</Td>
                  <Td className="max-w-xs text-sm">{a.detail}</Td>
                  <Td>{a.action ?? "-"}</Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination info={anomaliesPage.info} {...pagination} label="anomalie" />
        </Card>
      )}

      {tab === "encaissements" && (
        <Card title="Encaissements" description="Paiements confirmés, du plus récent au plus ancien.">
          {payments.length === 0 ? (
            <EmptyState icon={Wallet} title="Aucun encaissement" />
          ) : (
            <Table bare head={["Date", "Parent", "Élève", "Montant", "Transaction"]}>
              {payments.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(p.approvedAt)}</Td>
                  <Td>{fullName(p.payer)}</Td>
                  <Td>{fullName(p.installment.tutoring.child)}</Td>
                  <Td className="whitespace-nowrap">{formatFcfa(p.amount)}</Td>
                  <Td className="font-mono text-xs">{p.providerTransactionId}</Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination info={paymentsPage} {...pagination} label="encaissement" />
        </Card>
      )}

      {tab === "historique" && (
        <Card title="Reversements effectués" description="Du plus récent au plus ancien.">
          {recentPayouts.length === 0 ? (
            <EmptyState icon={History} title="Aucun reversement effectué" />
          ) : (
            <Table bare head={["Date", "Éducateur", "Montant", "Mode", "Réf.", "Par"]}>
              {recentPayouts.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">{formatDate(p.executedAt)}</Td>
                  <Td>{fullName(p.educator.user)}</Td>
                  <Td className="whitespace-nowrap">{formatFcfa(p.netAmount)}</Td>
                  <Td>{p.method === "FEDAPAY" ? "FedaPay" : "Manuel"}</Td>
                  <Td className="font-mono text-xs">{p.providerReference}</Td>
                  <Td>{p.executedBy ? fullName(p.executedBy) : "-"}</Td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination info={payoutsPage} {...pagination} label="reversement" />
        </Card>
      )}
    </>
  );
}
