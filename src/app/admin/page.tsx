import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatFcfa } from "@/lib/format";
import { Card, PageHeader, Stat } from "@/components/ui";
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
    [toValidate, "dossier(s) éducateur à valider", "/admin/educateurs?statut=SUBMITTED"],
    [payoutsPending._count, `reversement(s) à effectuer (${formatFcfa(payoutsPending._sum.netAmount ?? 0)})`, "/admin/paiements"],
    [openComplaints, "réclamation(s) à traiter", "/admin/reclamations"],
    [disputed, "séance(s) contestée(s)", "/admin/tutorats?contestees=1"],
    [overdue._count, `échéance(s) en retard (${formatFcfa(overdue._sum.amount ?? 0)})`, "/admin/paiements#retards"],
  ] as const;

  return (
    <>
      <PageHeader title="Tableau de bord" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Parents" value={parents} href="/admin/parents" />
        <Stat label="Éducateurs vérifiés" value={educators} href="/admin/educateurs" />
        <Stat label="Élèves inscrits" value={children} href="/admin/eleves" />
        <Stat label="Tutorats en cours" value={activeTutorings} href="/admin/tutorats" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card title="À traiter">
          <ul className="space-y-2">
            {todo.map(([n, label, href]) => (
              <li key={href}>
                <Link href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${n ? "bg-amber-50 text-amber-900 hover:bg-amber-100" : "text-slate-500"}`}>
                  <span className="min-w-6 text-lg font-bold">{n}</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <MonthlyBars title="Encaissements par mois (FCFA)" data={revenueSeries} format={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <p className="mt-3 text-xs text-slate-500">Commission Access sur la période : {formatFcfa(commissionTotal)}</p>
        </Card>
        <Card>
          <MonthlyBars title="Inscriptions de parents" data={signupSeries("PARENT")} />
        </Card>
        <Card>
          <MonthlyBars title="Inscriptions d'éducateurs" data={signupSeries("EDUCATOR")} />
        </Card>
      </div>
    </>
  );
}
