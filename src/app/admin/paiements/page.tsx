import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/ui";
import { PayoutBadge } from "@/components/status";
import { PayoutForms } from "@/components/admin/forms";

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
      <PageHeader title="Paiements" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Reversements à effectuer" value={formatFcfa(toPay.reduce((s, p) => s + p.netAmount, 0))} hint={`${toPay.length} reversement(s)`} />
        <Stat label="Échéances en retard" value={formatFcfa(overdue.reduce((s, i) => s + i.amount, 0))} hint={`${overdue.length} échéance(s)`} />
        <Stat label="Encaissé (50 derniers)" value={formatFcfa(payments.reduce((s, p) => s + p.amount, 0))} />
      </div>

      <Card title="Reversements aux éducateurs" className="mb-5">
        {toPay.length === 0 ? (
          <EmptyState title="Aucun reversement en attente." />
        ) : (
          <Table head={["Éducateur", "Élève · échéance", "Payé", "Commission", "À reverser", "Mobile Money", "Statut", "Action"]}>
            {toPay.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/admin/educateurs/${p.educatorId}`} className="text-brand-700 hover:underline">
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
                  {p.failureReason && <span className="block text-xs text-red-700">{p.failureReason}</span>}
                </Td>
                <Td>{p.status !== "PROCESSING" && <PayoutForms payoutId={p.id} fedapay={fedapay} />}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card title="Échéances en retard" className="mb-5">
        <div id="retards" />
        {overdue.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune.</p>
        ) : (
          <Table head={["Parent", "Élève", "Montant", "Date limite", "Relancé le"]}>
            {overdue.map((i) => (
              <tr key={i.id}>
                <Td>
                  <Link href={`/admin/parents/${i.tutoring.parentId}`} className="text-brand-700 hover:underline">
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

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Derniers encaissements">
          <Table head={["Date", "Parent", "Élève", "Montant", "Transaction"]}>
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
          <Table head={["Date", "Éducateur", "Montant", "Mode", "Réf.", "Par"]}>
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
