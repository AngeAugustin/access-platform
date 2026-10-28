import Link from "next/link";
import { BookOpenCheck, CalendarClock, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { tutoringProgress } from "@/lib/progress";
import { widthClass } from "@/lib/ui-scale";
import { Badge, EmptyState, LinkButton, PageHeader, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Suivis" };

export default async function TutoringsPage() {
  const user = await requireRole("PARENT");
  const tutorings = await db.tutoring.findMany({
    where: { parentId: user.id },
    include: {
      child: true,
      educator: { include: { user: true, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      _count: { select: { lessons: { where: { status: "RECORDED" } } } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
  return (
    <>
      <PageHeader title="Suivis" subtitle="Les tutorats de vos enfants, en cours et passés." />
      {tutorings.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="Aucun tutorat pour l'instant" action={<LinkButton href="/parent/educateurs">Trouver un éducateur</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tutorings.map((t) => {
            const progress = tutoringProgress(t.startDate, t.stoppedAt ?? t.endDate);
            return (
              <li key={t.id}>
                <Link
                  href={`/parent/tutorats/${t.id}`}
                  className="group block rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={44} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{fullName(t.child)}</p>
                        <p className="truncate text-sm text-slate-500">avec {fullName(t.educator.user)}</p>
                      </div>
                    </div>
                    <TutoringBadge status={t.status} />
                  </div>
                  <p className="mt-4 flex items-center gap-1.5 text-[13px] text-slate-500">
                    <CalendarClock className="size-3.5" aria-hidden /> {t.slotsLabel}
                  </p>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                      <span>
                        {formatDate(t.startDate)} → {formatDate(t.endDate)}
                      </span>
                      <span>{progress} %</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={cx("h-full rounded-full bg-brand-500", widthClass(progress))} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    {t._count.lessons > 0 ? <Badge tone="amber">{t._count.lessons} séance(s) à confirmer</Badge> : <span className="text-xs text-slate-400">Réf. {t.reference}</span>}
                    <ChevronRight className="size-4 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
