import Link from "next/link";
import { BookOpenCheck, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { currentWeek, tutoringProgress } from "@/lib/progress";
import { widthClass } from "@/lib/ui-scale";
import { EmptyState, LinkButton, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TutoringBadge } from "@/components/status";
import { Bar, ScreenTitle, panel } from "@/components/parent/kit";

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
  const now = new Date();
  return (
    <>
      <ScreenTitle eyebrow="Les tutorats de vos enfants" title="Suivis" />
      {tutorings.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="Aucun tutorat pour l'instant" action={<LinkButton href="/parent/educateurs">Trouver un éducateur</LinkButton>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tutorings.map((t) => {
            const progress = tutoringProgress(t.startDate, t.stoppedAt ?? t.endDate, now);
            return (
              <li key={t.id}>
                <Link href={`/parent/tutorats/${t.id}`} className={cx(panel, "group block p-4 transition hover:shadow-lift")}>
                  <div className="flex items-center gap-3">
                    <Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-15px font-semibold text-ink">
                        {t.child.firstName} · {fullName(t.educator.user)}
                      </p>
                      <p className="mt-0.5 truncate text-13px text-slate-500">{t.slotsLabel}</p>
                    </div>
                    <ChevronRight className="size-5 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                      <span>{t.status === "ACTIVE" ? `Semaine ${currentWeek(t.startDate, t.durationWeeks, now)} sur ${t.durationWeeks}` : `${formatDate(t.startDate)} → ${formatDate(t.endDate)}`}</span>
                      <span>{progress} %</span>
                    </div>
                    <Bar widthClass={widthClass(progress)} />
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <TutoringBadge status={t.status} />
                    {t._count.lessons > 0 && (
                      <span className="rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
                        {t._count.lessons} séance{t._count.lessons > 1 ? "s" : ""} à confirmer
                      </span>
                    )}
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
