import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { LessonBadge } from "@/components/status";

export const metadata = { title: "Mes séances" };

export default async function LessonsPage() {
  const user = await requireRole("EDUCATOR");
  const lessons = await db.lesson.findMany({
    where: { tutoring: { educator: { userId: user.id } } },
    include: { tutoring: { include: { child: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return (
    <>
      <PageHeader title="Mes séances" subtitle="Les 200 dernières séances saisies." />
      {lessons.length === 0 ? (
        <EmptyState title="Aucune séance saisie." />
      ) : (
        <Table head={["Date", "Créneau", "Élève", "Travail effectué", "Statut"]}>
          {lessons.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">{formatDate(l.date)}</Td>
              <Td className="whitespace-nowrap">{TIME_SLOTS[l.slot]}</Td>
              <Td>
                <Link href={`/educateur/eleves/${l.tutoringId}`} className="text-brand-700 hover:underline">
                  {fullName(l.tutoring.child)}
                </Link>
              </Td>
              <Td className="max-w-md">{l.workDone}</Td>
              <Td>
                <LessonBadge status={l.status} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
