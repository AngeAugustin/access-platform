import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TUTORING_STATUS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td, buttonClass } from "@/components/ui";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Tutorats" };

export default async function AdminTutoringsPage({ searchParams }: { searchParams: Promise<{ statut?: string; contestees?: string }> }) {
  await requireRole("ADMIN");
  const { statut, contestees } = await searchParams;
  const status = statut && statut in TUTORING_STATUS ? (statut as keyof typeof TUTORING_STATUS) : undefined;
  const tutorings = await db.tutoring.findMany({
    where: { ...(status ? { status } : {}), ...(contestees ? { lessons: { some: { status: "DISPUTED" } } } : {}) },
    include: {
      child: true,
      parent: true,
      educator: { include: { user: true } },
      _count: { select: { lessons: true } },
      lessons: { where: { status: "DISPUTED" }, select: { id: true } },
    },
    orderBy: { startDate: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Tutorats" />
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <select name="statut" defaultValue={statut ?? ""} className="field w-auto min-w-48" aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(TUTORING_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="contestees" value="1" defaultChecked={Boolean(contestees)} /> Avec séance contestée
        </label>
        <button className={buttonClass("secondary")}>Filtrer</button>
      </form>
      {tutorings.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="Aucun tutorat" />
      ) : (
        <Table head={["Réf.", "Élève", "Parent", "Éducateur", "Période", "Séances", "Statut"]}>
          {tutorings.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/tutorats/${t.id}`} className="font-mono text-xs font-medium text-brand-700 hover:text-brand-800">
                  {t.reference}
                </Link>
              </Td>
              <Td>
                {fullName(t.child)} <span className="text-xs text-slate-500">({t.classLevel})</span>
              </Td>
              <Td>{fullName(t.parent)}</Td>
              <Td>{fullName(t.educator.user)}</Td>
              <Td className="whitespace-nowrap">
                {formatDate(t.startDate)} → {formatDate(t.endDate)}
              </Td>
              <Td>
                {t._count.lessons}
                {t.lessons.length > 0 && <span className="ml-1 text-xs font-semibold text-rose-700">({t.lessons.length} contestée)</span>}
              </Td>
              <Td>
                <TutoringBadge status={t.status} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
