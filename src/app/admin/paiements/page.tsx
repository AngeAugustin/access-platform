import Link from "next/link";
import { CalendarX, CircleCheck, HandCoins, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/ui";
import { PayoutBadge } from "@/components/status";
import { CheckPayoutForm, PayoutForms } from "@/components/admin/forms";

export const metadata = { title: "Paiements" };

export default async function AdminPaymentsPage() {
  await requireRole("ADMIN");
  const now = new Date();
  const [toPay, recentPayouts, payments, overdue] = await Promise.all([
    db.payout.findMany({
      where: { status: { in: ["PENDING", "FAILED", "PROCESSING"] } },
      include: { educator: { include: { user: true } }, installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.payout.findMany({
      where: { status: "DONE" },
      include: { educator: { include: { user: true } }, executedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { executedAt: "desc" },
      take: 30,
    }),
    db.payment.findMany({
      where: { status: "APPROVED" },
      include: { payer: true, installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { approvedAt: "desc" },
      take: 50,
    }),
    db.installment.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      include: { tutoring: { include: { child: true, parent: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  const fedapay = fedapayConfigured();

  return (
    <>
      <PageHeader title="Paiements" subtitle="Encaissements des familles et reversements aux éducateurs." />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1">
        <Stat label="Reversements à effectuer" value={formatFcfa(toPay.reduce((s, p) => s + p.netAmount, 0))} hint={`${toPay.length} reversement(s)`} icon={HandCoins} />
        <Stat label="Échéances en retard" value={formatFcfa(overdue.reduce((s, i) => s + i.amount, 0))} hint={`${overdue.length} échéance(s)`} icon={CalendarX} tone={overdue.length ? "rose" : "slate"} />
        <Stat label="Encaissé (50 derniers)" value={formatFcfa(payments.reduce((s, p) => s + p.amount, 0))} icon={Wallet} tone="green" />
      </div>

      <Card title="Reversements aux éducateurs" className="mb-5">
        {toPay.length === 0 ? (
          <EmptyState icon={CircleCheck} title="Aucun reversement en attente" />
        ) : (
          <Table bare head={["Éducateur", "Élève · échéance", "Payé", "Commission", "À reverser", "Mobile Money", "Statut", "Action"]}>
            {toPay.map((p) => (
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
                <Td>{p.educator.payoutPhone ?? "—"}</Td>
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
      </Card>

      <Card title="Échéances en retard" className="mb-5">
        <div id="retards" />
        {overdue.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune.</p>
        ) : (
          <Table bare head={["Parent", "Élève", "Montant", "Date limite", "Relancé le"]}>
            {overdue.map((i) => (
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
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Derniers encaissements">
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
        </Card>
        <Card title="Derniers reversements">
          <Table bare head={["Date", "Éducateur", "Montant", "Mode", "Réf.", "Par"]}>
            {recentPayouts.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{formatDate(p.executedAt)}</Td>
                <Td>{fullName(p.educator.user)}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(p.netAmount)}</Td>
                <Td>{p.method === "FEDAPAY" ? "FedaPay" : "Manuel"}</Td>
                <Td className="font-mono text-xs">{p.providerReference}</Td>
                <Td>{p.executedBy ? fullName(p.executedBy) : "—"}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
