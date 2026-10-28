import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, PageHeader, Stat, Table, Td } from "@/components/ui";
import { InstallmentBadge, PayoutBadge } from "@/components/status";

export const metadata = { title: "Mes paiements" };

export default async function EducatorPaymentsPage() {
  const user = await requireRole("EDUCATOR");
  const profile = await db.educatorProfile.findUnique({ where: { userId: user.id } });
  const [payouts, upcoming] = profile
    ? await Promise.all([
        db.payout.findMany({
          where: { educatorId: profile.id },
          include: { installment: { include: { tutoring: { include: { child: true } } } } },
          orderBy: { createdAt: "desc" },
        }),
        db.installment.findMany({
          where: { status: "PENDING", tutoring: { educatorId: profile.id } },
          include: { tutoring: { include: { child: true } } },
          orderBy: { dueDate: "asc" },
        }),
      ])
    : [[], []];
  const now = new Date();
  const received = payouts.filter((p) => p.status === "DONE").reduce((s, p) => s + p.netAmount, 0);
  const toReceive = payouts.filter((p) => p.status !== "DONE").reduce((s, p) => s + p.netAmount, 0);

  return (
    <>
      <PageHeader title="Mes paiements" subtitle={`Reversements sur le ${profile?.payoutPhone ?? "numéro Mobile Money à renseigner dans votre dossier"}.`} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Reçu" value={formatFcfa(received)} />
        <Stat label="À recevoir" value={formatFcfa(toReceive)} hint="échéances payées par les parents" />
        <Stat label="Échéances non encore payées" value={upcoming.length} />
      </div>
      <Card title="Reversements" className="mb-5">
        {payouts.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun reversement pour l&apos;instant.</p>
        ) : (
          <Table head={["Élève", "Échéance", "Montant payé", "Commission", "Net", "Statut", "Date"]}>
            {payouts.map((p) => (
              <tr key={p.id}>
                <Td>{fullName(p.installment.tutoring.child)}</Td>
                <Td>{p.installment.index}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(p.grossAmount)}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(p.commissionAmount)}</Td>
                <Td className="whitespace-nowrap font-semibold">{formatFcfa(p.netAmount)}</Td>
                <Td>
                  <PayoutBadge status={p.status} />
                </Td>
                <Td className="whitespace-nowrap">{formatDate(p.executedAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Échéances en attente de paiement par les parents">
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune.</p>
        ) : (
          <Table head={["Élève", "Échéance", "Montant", "Date limite", "Statut"]}>
            {upcoming.map((i) => (
              <tr key={i.id}>
                <Td>{fullName(i.tutoring.child)}</Td>
                <Td>{i.index}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(i.amount)}</Td>
                <Td className="whitespace-nowrap">{formatDate(i.dueDate)}</Td>
                <Td>
                  <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
