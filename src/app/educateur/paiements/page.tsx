import { Banknote, CircleCheck, Hourglass, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, EmptyState, List, ListRow, PageHeader, Stat } from "@/components/ui";
import { InstallmentBadge, PayoutBadge } from "@/components/status";

export const metadata = { title: "Mes revenus" };

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
      <PageHeader
        title="Revenus"
        subtitle={profile?.payoutPhone ? `Vos reversements arrivent sur le ${profile.payoutPhone}.` : "Renseignez votre numéro Mobile Money dans votre dossier."}
      />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 [&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-span-1">
        <Stat label="Déjà reçu" value={formatFcfa(received)} icon={CircleCheck} tone="green" />
        <Stat label="À recevoir" value={formatFcfa(toReceive)} hint="échéances payées par les parents" icon={Wallet} />
        <Stat label="Échéances à venir" value={upcoming.length} hint="pas encore payées" icon={Hourglass} tone="amber" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Reversements" description="Montant payé par la famille, moins la commission Access.">
          {payouts.length === 0 ? (
            <EmptyState icon={Banknote} title="Aucun reversement pour l'instant" />
          ) : (
            <List>
              {payouts.map((p) => (
                <ListRow
                  key={p.id}
                  title={formatFcfa(p.netAmount)}
                  meta={
                    <>
                      {fullName(p.installment.tutoring.child)} · échéance {p.installment.index}
                      <span className="block text-xs text-slate-400">
                        {formatFcfa(p.grossAmount)} payés − {formatFcfa(p.commissionAmount)} de commission
                        {p.executedAt && ` · versé le ${formatDate(p.executedAt)}`}
                      </span>
                    </>
                  }
                  trailing={<PayoutBadge status={p.status} />}
                />
              ))}
            </List>
          )}
        </Card>
        <Card title="Échéances à venir" description="En attente de paiement par les parents.">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune.</p>
          ) : (
            <List>
              {upcoming.map((i) => (
                <ListRow
                  key={i.id}
                  title={formatFcfa(i.amount)}
                  meta={`${fullName(i.tutoring.child)} · avant le ${formatDate(i.dueDate)}`}
                  trailing={<InstallmentBadge status={i.status} overdue={i.dueDate < now} />}
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
