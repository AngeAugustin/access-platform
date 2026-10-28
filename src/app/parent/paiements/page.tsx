import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/ui";
import { InstallmentBadge } from "@/components/status";
import { PayButton } from "@/components/parent/pay-button";

export const metadata = { title: "Paiements" };

export default async function PaymentsPage() {
  const user = await requireRole("PARENT");
  const [installments, payments] = await Promise.all([
    db.installment.findMany({
      where: { tutoring: { parentId: user.id }, status: { not: "CANCELLED" } },
      include: { tutoring: { include: { child: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    db.payment.findMany({
      where: { payerId: user.id, status: "APPROVED" },
      include: { installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { approvedAt: "desc" },
    }),
  ]);
  const now = new Date();
  const pending = installments.filter((i) => i.status === "PENDING");
  const due = pending.filter((i) => i.dueDate <= new Date(now.getTime() + 7 * 864e5));

  return (
    <>
      <PageHeader title="Paiements" subtitle="Réglez vos échéances par Mobile Money (MTN, Moov) ou carte via FedaPay." />
      {!fedapayConfigured() && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Le paiement en ligne n&apos;est pas encore activé sur ce serveur.</p>}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Reste à payer" value={formatFcfa(pending.reduce((s, i) => s + i.amount, 0))} />
        <Stat label="À régler sous 7 jours" value={formatFcfa(due.reduce((s, i) => s + i.amount, 0))} />
        <Stat label="Déjà payé" value={formatFcfa(payments.reduce((s, p) => s + p.amount, 0))} />
      </div>
      <Card title="Échéances" className="mb-5">
        {installments.length === 0 ? (
          <EmptyState title="Aucune échéance." />
        ) : (
          <Table head={["Enfant", "Échéance", "Montant", "Date limite", "Statut", ""]}>
            {installments.map((i) => (
              <tr key={i.id}>
                <Td>
                  <Link href={`/parent/tutorats/${i.tutoringId}`} className="text-brand-700 hover:underline">
                    {fullName(i.tutoring.child)}
                  </Link>
                </Td>
                <Td>
                  {i.index} · {i.weeks} sem.
                </Td>
                <Td className="whitespace-nowrap font-medium">{formatFcfa(i.amount)}</Td>
                <Td className="whitespace-nowrap">{formatDate(i.dueDate)}</Td>
                <Td>
                  <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                </Td>
                <Td>{i.status === "PENDING" && <PayButton installmentId={i.id} />}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Historique des paiements">
        {payments.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun paiement pour le moment.</p>
        ) : (
          <Table head={["Date", "Enfant", "Montant", "Référence"]}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{formatDateTime(p.approvedAt)}</Td>
                <Td>{fullName(p.installment.tutoring.child)}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(p.amount)}</Td>
                <Td className="font-mono text-xs">
                  {p.installment.reference} · FedaPay {p.providerTransactionId}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
