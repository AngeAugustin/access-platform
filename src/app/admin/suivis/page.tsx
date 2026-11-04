import Link from "next/link";
import { ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { FOLLOW_UP_STATUS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { addDays, localDate } from "@/lib/follow-up";
import { Badge, EmptyState, PageHeader, Tabs, Table, Td, cx } from "@/components/ui";
import { AdminEndFollowUpForm } from "@/components/admin/tutor-forms";

export const metadata = { title: "Suivis" };

const tones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function AdminFollowUpsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  await requireRole("ADMIN");
  const { onglet } = await searchParams;
  const tab = onglet === "demandes" ? "demandes" : onglet === "clos" ? "clos" : "actifs";
  const status = tab === "actifs" ? { status: "ACTIVE" as const } : tab === "demandes" ? { status: "REQUESTED" as const } : { status: { in: ["DECLINED" as const, "CANCELLED" as const, "ENDED" as const] } };
  const now = new Date();
  const weekAgo = addDays(localDate(now), -7);
  const [followUps, counts] = await Promise.all([
    db.followUp.findMany({
      where: status,
      include: {
        parent: true,
        tutor: { include: { user: { select: { firstName: true, lastName: true } } } },
        children: { include: { child: { select: { firstName: true } } } },
        _count: { select: { tasks: { where: { active: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.followUp.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string[]) => counts.filter((c) => s.includes(c.status)).reduce((n, c) => n + c._count, 0);
  // Retours des 7 derniers jours, par suivi.
  const recent = await db.taskOccurrence.findMany({
    where: { date: { gte: weekAgo, lt: localDate(now) }, task: { followUpId: { in: followUps.map((f) => f.id) } } },
    select: { status: true, task: { select: { followUpId: true } } },
  });
  const week = new Map<string, { done: number; total: number }>();
  for (const r of recent) {
    const w = week.get(r.task.followUpId) ?? { done: 0, total: 0 };
    w.total++;
    if (r.status !== "PENDING" && r.status !== "MISSED") w.done++;
    week.set(r.task.followUpId, w);
  }

  return (
    <>
      <PageHeader title="Suivis" subtitle="Les parents confient aux tuteurs le suivi quotidien de leurs enfants." />
      <Tabs
        label="Suivis"
        current={tab}
        items={[
          { key: "actifs", href: "/admin/suivis", label: "Actifs", count: count(["ACTIVE"]) },
          { key: "demandes", href: "/admin/suivis?onglet=demandes", label: "Demandes en attente", count: count(["REQUESTED"]) },
          { key: "clos", href: "/admin/suivis?onglet=clos", label: "Clos", count: count(["DECLINED", "CANCELLED", "ENDED"]) },
        ]}
      />
      {followUps.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucun suivi" />
      ) : (
        <Table head={["Référence", "Famille", "Tuteur", "Enfants", "Actions", "Retours (7 j)", "Forfait", "Depuis", "Statut", ""]}>
          {followUps.map((f) => {
            const w = week.get(f.id);
            const rate = w && w.total > 0 ? Math.round((w.done / w.total) * 100) : null;
            return (
              <tr key={f.id} className="align-top hover:bg-slate-50">
                <Td className="font-mono text-xs">{f.reference}</Td>
                <Td>
                  <Link href={`/admin/parents/${f.parentId}`} className="font-medium text-brand-700 hover:text-brand-800">
                    {fullName(f.parent)}
                  </Link>
                </Td>
                <Td>
                  <Link href={`/admin/tuteurs/${f.tutorId}`} className="font-medium text-brand-700 hover:text-brand-800">
                    {fullName(f.tutor.user)}
                  </Link>
                </Td>
                <Td>{f.children.map((c) => c.child.firstName).join(", ")}</Td>
                <Td>{f._count.tasks}</Td>
                <Td>{rate === null ? <span className="text-slate-400">-</span> : <span className={cx("font-medium", rate >= 90 ? "text-emerald-700" : rate >= 75 ? "text-amber-600" : "text-rose-600")}>{w!.done} / {w!.total}</span>}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(f.monthlyPrice)}</Td>
                <Td className="whitespace-nowrap">{formatDate(f.status === "REQUESTED" ? f.createdAt : f.startDate)}</Td>
                <Td>
                  <Badge tone={tones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
                  {f.endReason && <span className="mt-1 block max-w-48 text-xs text-slate-500">{f.endReason}</span>}
                  {f.declineReason && <span className="mt-1 block max-w-48 text-xs text-slate-500">{f.declineReason}</span>}
                </Td>
                <Td>{f.status === "ACTIVE" && <AdminEndFollowUpForm followUpId={f.id} />}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
