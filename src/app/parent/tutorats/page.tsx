import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Suivis" };

export default async function TutoringsPage() {
  const user = await requireRole("PARENT");
  const tutorings = await db.tutoring.findMany({
    where: { parentId: user.id },
    include: {
      child: true,
      educator: { include: { user: true } },
      _count: { select: { lessons: { where: { status: "RECORDED" } } } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
  return (
    <>
      <PageHeader title="Suivis" subtitle="Tous les tutorats de vos enfants." />
      {tutorings.length === 0 ? (
        <EmptyState title="Aucun tutorat." />
      ) : (
        <Table head={["Enfant", "Éducateur", "Période", "Créneaux", "À confirmer", "Statut"]}>
          {tutorings.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/parent/tutorats/${t.id}`} className="font-medium text-brand-700 hover:underline">
                  {fullName(t.child)}
                </Link>
              </Td>
              <Td>{fullName(t.educator.user)}</Td>
              <Td className="whitespace-nowrap">
                {formatDate(t.startDate)} → {formatDate(t.endDate)}
              </Td>
              <Td>{t.slotsLabel}</Td>
              <Td>{t._count.lessons || "—"}</Td>
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
