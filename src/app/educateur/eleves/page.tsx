import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Mes élèves" };

export default async function StudentsPage() {
  const user = await requireRole("EDUCATOR");
  const tutorings = await db.tutoring.findMany({
    where: { educator: { userId: user.id } },
    include: { child: true, parent: { select: { firstName: true, lastName: true } }, _count: { select: { lessons: true } } },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
  return (
    <>
      <PageHeader title="Mes élèves" />
      {tutorings.length === 0 ? (
        <EmptyState title="Aucun élève pour le moment.">Les familles vous choisissent dans le catalogue une fois votre dossier validé.</EmptyState>
      ) : (
        <Table head={["Élève", "Classe", "Parent", "Période", "Créneaux", "Séances", "Statut"]}>
          {tutorings.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/educateur/eleves/${t.id}`} className="font-medium text-brand-700 hover:underline">
                  {fullName(t.child)}
                </Link>
              </Td>
              <Td>{t.classLevel}</Td>
              <Td>{fullName(t.parent)}</Td>
              <Td className="whitespace-nowrap">
                {formatDate(t.startDate)} → {formatDate(t.endDate)}
              </Td>
              <Td>{t.slotsLabel}</Td>
              <Td>{t._count.lessons}</Td>
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
