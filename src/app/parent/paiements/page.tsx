import { CircleCheck, Clock, CreditCard, Receipt, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { Card, EmptyState, List, ListRow, Notice, PageHeader, Stat } from "@/components/ui";
import { InstallmentBadge } from "@/components/status";
import { PayButton } from "@/components/parent/pay-button";

export const metadata = { title: "Paiements" };

export default async function PaymentsPage() {
  const user = await requireRole("PARENT");
  const [installments, payments] = await Promise.all([
    db.installment.findMany({
      where: { tutoring: { parentId: user.id }, status: "PENDING" },
      include: { tutoring: { include: { child: true } } },
      orderBy: { dueDate: "asc" },
    }),
    db.payment.findMany({
      where: { payerId: user.id, status: "APPROVED" },
      include: { installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { approvedAt: "desc" },
    }),
  ]);
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 864e5);
  const dueSoon = installments.filter((i) => i.dueDate <= soon);
  const overdue = installments.filter((i) => i.dueDate < now);

  return (
    <>
      <PageHeader title="Paiements" subtitle="Réglez vos échéances par Mobile Money (MTN, Moov) ou par carte, via FedaPay." />
      {!fedapayConfigured() && (
        <div className="mb-6">
          <Notice tone="amber" icon={TriangleAlert} title="Paiement en ligne indisponible">
            Le paiement en ligne n&apos;est pas encore activé sur ce serveur.
          </Notice>
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1">
        <Stat label="Reste à payer" value={formatFcfa(installments.reduce((s, i) => s + i.amount, 0))} icon={CreditCard} />
        <Stat
          label="Sous 7 jours"
          value={formatFcfa(dueSoon.reduce((s, i) => s + i.amount, 0))}
          hint={overdue.length ? `dont ${overdue.length} en retard` : undefined}
          icon={Clock}
          tone={overdue.length ? "rose" : "amber"}
        />
        <Stat label="Déjà payé" value={formatFcfa(payments.reduce((s, p) => s + p.amount, 0))} icon={CircleCheck} tone="green" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title="À payer">
          {installments.length === 0 ? (
            <EmptyState icon={CircleCheck} title="Tout est réglé">
              Aucune échéance en attente.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {installments.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 p-4">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-tight text-ink tabular-nums">{formatFcfa(i.amount)}</p>
                    <p className="text-[13px] text-slate-500">
                      {fullName(i.tutoring.child)} · échéance {i.index} · {i.weeks} sem.
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                      avant le {formatDate(i.dueDate)}
                    </div>
                  </div>
                  <PayButton installmentId={i.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Historique" description="Chaque paiement confirmé par FedaPay.">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun paiement pour le moment.</p>
          ) : (
            <List>
              {payments.map((p) => (
                <ListRow
                  key={p.id}
                  leading={
                    <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" aria-hidden>
                      <Receipt className="size-4" />
                    </span>
                  }
                  title={formatFcfa(p.amount)}
                  meta={
                    <>
                      {fullName(p.installment.tutoring.child)} · {formatDateTime(p.approvedAt)}
                      <span className="block font-mono text-[11px] text-slate-400">
                        {p.installment.reference} · FedaPay {p.providerTransactionId}
                      </span>
                    </>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
