import Link from "next/link";
import { CalendarDays, ChevronRight, Smile } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/avatar";
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
      <PageHeader title="Mes élèves" subtitle="Ouvrez la fiche d'un élève pour saisir une séance." />
      {tutorings.length === 0 ? (
        <EmptyState icon={Smile} title="Aucun élève pour le moment">
          Les familles vous choisissent dans le catalogue une fois votre dossier validé.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutorings.map((t) => (
            <li key={t.id}>
              <Link
                href={`/educateur/eleves/${t.id}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={fullName(t.child)} size={44} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{fullName(t.child)}</p>
                      <p className="truncate text-sm text-slate-500">
                        {t.classLevel} · parent {fullName(t.parent)}
                      </p>
                    </div>
                  </div>
                  <TutoringBadge status={t.status} />
                </div>
                <p className="mt-4 flex items-center gap-1.5 text-[13px] text-slate-500">
                  <CalendarDays className="size-3.5" aria-hidden /> {t.slotsLabel}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>
                    {t._count.lessons} séance{t._count.lessons > 1 ? "s" : ""} · jusqu&apos;au {formatDate(t.endDate)}
                  </span>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
