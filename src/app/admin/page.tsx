import Link from "next/link";
import { BookOpenCheck, CalendarX, ChevronRight, FolderSearch, GraduationCap, HandCoins, MessageSquareWarning, Scale, Smile, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatFcfa } from "@/lib/format";
import { Card, IconTile, PageHeader, Stat, cx } from "@/components/ui";
import { MonthlyBars } from "@/components/admin/bar-chart";

export const metadata = { title: "Tableau de bord" };

function lastMonths(n: number) {
  const months: { key: string; label: string }[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    months.push({ key: m.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(m) });
  }
  return months;
}

export default async function AdminDashboard() {
  await requireRole("ADMIN");
  const months = lastMonths(6);
  const since = new Date(`${months[0].key}-01T00:00:00Z`);
  const [parents, educators, children, activeTutorings, toValidate, openComplaints, payoutsPending, disputed, overdue, signups, revenue] = await Promise.all([
    db.user.count({ where: { role: "PARENT" } }),
    db.educatorProfile.count({ where: { status: "VALIDATED" } }),
    db.child.count(),
    db.tutoring.count({ where: { status: "ACTIVE" } }),
    db.educatorProfile.count({ where: { status: "SUBMITTED" } }),
    db.complaint.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.payout.aggregate({ where: { status: { in: ["PENDING", "FAILED"] } }, _count: true, _sum: { netAmount: true } }),
    db.lesson.count({ where: { status: "DISPUTED" } }),
    db.installment.aggregate({ where: { status: "PENDING", dueDate: { lt: new Date() } }, _count: true, _sum: { amount: true } }),
    db.$queryRaw<{ month: string; role: string; n: bigint }[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, "role"::text AS role, count(*) AS n
      FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1, 2`,
    db.$queryRaw<{ month: string; total: bigint; commission: bigint }[]>`
      SELECT to_char(date_trunc('month', p."approvedAt"), 'YYYY-MM') AS month, sum(p.amount) AS total,
             coalesce(sum(po."commissionAmount"), 0) AS commission
      FROM "Payment" p LEFT JOIN "Payout" po ON po."installmentId" = p."installmentId"
      WHERE p.status = 'APPROVED' AND p."approvedAt" >= ${since} GROUP BY 1`,
  ]);
  const signupSeries = (role: string) => months.map((m) => ({ label: m.label, value: Number(signups.find((s) => s.month === m.key && s.role === role)?.n ?? 0) }));
  const revenueSeries = months.map((m) => ({ label: m.label, value: Number(revenue.find((r) => r.month === m.key)?.total ?? 0) }));
  const commissionTotal = revenue.reduce((s, r) => s + Number(r.commission), 0);

  const todo = [
    { n: toValidate, label: "Dossiers à valider", hint: "Éducateurs en attente", href: "/admin/educateurs?statut=SUBMITTED", icon: FolderSearch },
    { n: payoutsPending._count, label: "Reversements à faire", hint: formatFcfa(payoutsPending._sum.netAmount ?? 0), href: "/admin/paiements", icon: HandCoins },
    { n: openComplaints, label: "Réclamations ouvertes", hint: "À traiter", href: "/admin/reclamations", icon: MessageSquareWarning },
    { n: disputed, label: "Séances contestées", hint: "À arbitrer", href: "/admin/tutorats?contestees=1", icon: Scale },
    { n: overdue._count, label: "Échéances en retard", hint: formatFcfa(overdue._sum.amount ?? 0), href: "/admin/paiements#retards", icon: CalendarX },
  ];
  const pendingCount = todo.reduce((s, t) => s + t.n, 0);

  return (
    <>
      <PageHeader eyebrow="Vue d'ensemble" title="Tableau de bord" subtitle={pendingCount ? `${pendingCount} élément${pendingCount > 1 ? "s demandent" : " demande"} votre attention.` : "Rien en attente."} />
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Parents" value={parents} icon={Users} href="/admin/parents" />
        <Stat label="Éducateurs vérifiés" value={educators} icon={GraduationCap} href="/admin/educateurs" tone="green" />
        <Stat label="Élèves inscrits" value={children} icon={Smile} href="/admin/eleves" tone="amber" />
        <Stat label="Tutorats en cours" value={activeTutorings} icon={BookOpenCheck} href="/admin/tutorats" tone="slate" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="À traiter" padded={false}>
          <ul className="divide-y divide-slate-100">
            {todo.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-slate-50 sm:px-6">
                  <IconTile icon={t.icon} size="sm" tone={t.n ? "amber" : "slate"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{t.label}</span>
                    <span className="block text-xs text-slate-500">{t.hint}</span>
                  </span>
                  <span className={cx("min-w-7 rounded-full px-2 py-0.5 text-center text-sm font-semibold tabular-nums", t.n ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400")}>{t.n}</span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Encaissements" description={`Six derniers mois · commission Access ${formatFcfa(commissionTotal)}`}>
          <MonthlyBars data={revenueSeries} format={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
        </Card>
        <Card title="Inscriptions de parents" description="Six derniers mois">
          <MonthlyBars data={signupSeries("PARENT")} />
        </Card>
        <Card title="Inscriptions d'éducateurs" description="Six derniers mois">
          <MonthlyBars data={signupSeries("EDUCATOR")} />
        </Card>
      </div>
    </>
  );
}
