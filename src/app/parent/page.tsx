import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { InstallmentBadge, TutoringBadge } from "@/components/status";

export const metadata = { title: "Accueil parent" };

export default async function ParentHome() {
  const user = await requireRole("PARENT");
  const [childrenCount, activeTutorings, nextInstallments, toConfirm] = await Promise.all([
    db.child.count({ where: { parentId: user.id } }),
    db.tutoring.findMany({
      where: { parentId: user.id, status: "ACTIVE" },
      include: { child: true, educator: { include: { user: true } } },
      orderBy: { startDate: "asc" },
    }),
    db.installment.findMany({
      where: { status: "PENDING", tutoring: { parentId: user.id } },
      include: { tutoring: { include: { child: true } } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    db.lesson.count({ where: { status: "RECORDED", tutoring: { parentId: user.id } } }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader title={`Bonjour ${user.firstName}`} subtitle="Le suivi scolaire de vos enfants, en un coup d'œil." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Enfants inscrits" value={childrenCount} href="/parent/enfants" />
        <Stat label="Tutorats en cours" value={activeTutorings.length} href="/parent/tutorats" />
        <Stat label="Séances à confirmer" value={toConfirm} href="/parent/tutorats" />
        <Stat
          label="Prochaine échéance"
          value={nextInstallments[0] ? formatFcfa(nextInstallments[0].amount) : "—"}
          hint={nextInstallments[0] ? `avant le ${formatDate(nextInstallments[0].dueDate)}` : "Rien à payer"}
          href="/parent/paiements"
        />
      </div>

      {childrenCount === 0 ? (
        <EmptyState title="Commencez par inscrire votre enfant.">
          <LinkButton href="/parent/enfants/nouveau" className="mt-3">
            Inscrire un enfant
          </LinkButton>
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Tutorats en cours" action={<Link href="/parent/educateurs" className="text-sm font-semibold text-brand-700">+ Nouveau</Link>}>
            {activeTutorings.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun tutorat en cours. Choisissez un éducateur dans le catalogue.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {activeTutorings.map((t) => (
                  <li key={t.id} className="py-2">
                    <Link href={`/parent/tutorats/${t.id}`} className="flex items-center justify-between gap-3 hover:text-brand-700">
                      <span>
                        <span className="block font-medium">{fullName(t.child)}</span>
                        <span className="block text-xs text-slate-500">
                          avec {fullName(t.educator.user)} · {t.slotsLabel}
                        </span>
                      </span>
                      <TutoringBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Échéances à venir">
            {nextInstallments.length === 0 ? (
              <p className="text-sm text-slate-600">Aucune échéance en attente.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {nextInstallments.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="block font-medium">{formatFcfa(i.amount)}</span>
                      <span className="block text-xs text-slate-500">
                        {fullName(i.tutoring.child)} · avant le {formatDate(i.dueDate)}
                      </span>
                    </span>
                    <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                  </li>
                ))}
              </ul>
            )}
            <LinkButton href="/parent/paiements" variant="secondary" className="mt-3">
              Voir les paiements
            </LinkButton>
          </Card>
        </div>
      )}
    </>
  );
}
