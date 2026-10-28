import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/avatar";
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
      <PageHeader title="Séances" subtitle="Toutes les séances saisies, de la plus récente à la plus ancienne." />
      {lessons.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Aucune séance saisie">
          Ouvrez la fiche d&apos;un élève pour saisir votre première séance.
        </EmptyState>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link href={`/educateur/eleves/${l.tutoringId}`} className="flex gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6">
                  <div className="hidden w-20 shrink-0 text-center sm:block">
                    <p className="text-lg font-semibold text-ink tabular-nums">{formatDate(l.date).split(" ")[0]}</p>
                    <p className="text-xs text-slate-500">{formatDate(l.date).split(" ").slice(1).join(" ")}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <Avatar name={fullName(l.tutoring.child)} size={24} />
                        {fullName(l.tutoring.child)}
                        <span className="text-xs font-normal text-slate-400">
                          <span className="sm:hidden">{formatDate(l.date)} · </span>
                          {TIME_SLOTS[l.slot]}
                        </span>
                      </p>
                      <LessonBadge status={l.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{l.workDone}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
