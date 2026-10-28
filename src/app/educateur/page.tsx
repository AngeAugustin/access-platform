import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatFcfa, fullName } from "@/lib/format";
import { Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { ProfileBadge } from "@/components/status";

export const metadata = { title: "Accueil éducateur" };

export default async function EducatorHome() {
  const user = await requireRole("EDUCATOR");
  const profile = await db.educatorProfile.findUnique({ where: { userId: user.id } });
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const [active, lessonsThisMonth, toConfirm, pendingPayouts, recent] = profile
    ? await Promise.all([
        db.tutoring.findMany({ where: { educatorId: profile.id, status: "ACTIVE" }, include: { child: true }, orderBy: { startDate: "asc" } }),
        db.lesson.count({ where: { tutoring: { educatorId: profile.id }, date: { gte: monthStart } } }),
        db.lesson.count({ where: { tutoring: { educatorId: profile.id }, status: "RECORDED" } }),
        db.payout.aggregate({ where: { educatorId: profile.id, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { netAmount: true } }),
        db.lesson.findMany({ where: { tutoring: { educatorId: profile.id } }, include: { tutoring: { include: { child: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
      ])
    : [[], 0, 0, { _sum: { netAmount: 0 } }, []];

  return (
    <>
      <PageHeader title={`Bonjour ${user.firstName}`} />
      {profile?.status !== "VALIDATED" && (
        <Card className="mb-5 border-amber-200 bg-amber-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-amber-900">
                Votre dossier : <ProfileBadge status={profile?.status ?? "INCOMPLETE"} />
              </p>
              <p className="mt-1 text-sm text-amber-900">
                {profile?.status === "SUBMITTED"
                  ? "L'équipe Access vérifie vos pièces. Vous serez visible des familles dès la validation."
                  : profile?.status === "REJECTED"
                    ? `Motif : ${profile.rejectionReason ?? "non précisé"}. Corrigez votre dossier puis transmettez-le à nouveau.`
                    : "Complétez votre dossier et transmettez-le pour apparaître dans le catalogue des familles."}
              </p>
            </div>
            {profile?.status !== "SUBMITTED" && <LinkButton href="/educateur/dossier">Compléter mon dossier</LinkButton>}
          </div>
        </Card>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Élèves suivis" value={active.length} href="/educateur/eleves" />
        <Stat label="Séances ce mois-ci" value={lessonsThisMonth} href="/educateur/seances" />
        <Stat label="En attente de confirmation" value={toConfirm} hint="par les parents" />
        <Stat label="À recevoir" value={formatFcfa(pendingPayouts._sum.netAmount ?? 0)} href="/educateur/paiements" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Mes élèves">
          {active.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun élève pour le moment.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {active.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/educateur/eleves/${t.id}`} className="flex justify-between gap-3 text-sm hover:text-brand-700">
                    <span className="font-medium">{fullName(t.child)}</span>
                    <span className="text-slate-500">{t.slotsLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Dernières séances saisies">
          {recent.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune séance saisie.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recent.map((l) => (
                <li key={l.id} className="py-2">
                  <span className="font-medium">{fullName(l.tutoring.child)}</span> — {l.workDone.slice(0, 80)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
