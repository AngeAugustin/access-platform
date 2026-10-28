import { notFound } from "next/navigation";
import { CalendarClock, CircleCheck, NotebookPen, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { tutoringProgress } from "@/lib/progress";
import { Card, EmptyState, Notice, PageHeader, Stars } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { InstallmentBadge, LessonBadge, TutoringBadge } from "@/components/status";
import { EducatorReviewForm, LessonReview, StopTutoringForm } from "@/components/parent/tutoring-actions";
import { PayButton } from "@/components/parent/pay-button";

export const metadata = { title: "Suivi du tutorat" };

export default async function TutoringPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const user = await requireRole("PARENT");
  const { id } = await params;
  const { nouveau } = await searchParams;
  const t = await db.tutoring.findFirst({
    where: { id, parentId: user.id },
    include: {
      child: true,
      educator: { include: { user: { select: { firstName: true, lastName: true, phone: true } }, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      lessons: { orderBy: [{ date: "desc" }, { slot: "desc" }] },
      installments: { orderBy: { index: "asc" } },
      review: true,
    },
  });
  if (!t) notFound();
  const now = new Date();
  const total = t.installments.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.amount, 0);
  const paid = t.installments.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const progress = tutoringProgress(t.startDate, t.stoppedAt ?? t.endDate);

  return (
    <>
      <PageHeader
        back="/parent/tutorats"
        eyebrow={`Réf. ${t.reference}`}
        title={`Tutorat de ${t.child.firstName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <TutoringBadge status={t.status} />
            <span>
              {formatDate(t.startDate)} → {formatDate(t.endDate)} · {t.durationWeeks} semaines
            </span>
          </span>
        }
        action={t.status === "ACTIVE" ? <StopTutoringForm tutoringId={t.id} /> : undefined}
      />
      {nouveau && (
        <div className="mb-6">
          <Notice tone="green" icon={CircleCheck} title="Tutorat créé">
            {fullName(t.educator.user)} a été prévenu. Vos échéances sont listées ci-dessous.
          </Notice>
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 lg:order-2">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={48} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Éducateur</p>
                <p className="truncate font-semibold text-ink">{fullName(t.educator.user)}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5 text-sm">
              <a href={`tel:${t.educator.user.phone}`} className="flex items-center gap-2.5 text-slate-600 hover:text-brand-700">
                <Phone className="size-4 text-slate-400" aria-hidden /> {t.educator.user.phone}
              </a>
              <p className="flex items-center gap-2.5 text-slate-600">
                <CalendarClock className="size-4 text-slate-400" aria-hidden /> {t.slotsLabel}
              </p>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span>Avancement</span>
                <span>{progress} %</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {t.stoppedAt && (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                Arrêté le {formatDate(t.stoppedAt)} : {t.stopReason}
              </p>
            )}
          </Card>
          <Card title="Échéances" description={`${formatFcfa(paid)} payés sur ${formatFcfa(total)}`}>
            <ul className="space-y-2.5">
              {t.installments.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink tabular-nums">{formatFcfa(i.amount)}</p>
                    <p className="text-xs text-slate-500">
                      N°{i.index} · {i.weeks} sem. · {i.status === "PAID" ? `payée le ${formatDate(i.paidAt)}` : `avant le ${formatDate(i.dueDate)}`}
                    </p>
                    {i.status === "PENDING" && i.dueDate < now && <p className="mt-0.5 text-xs font-medium text-rose-600">En retard</p>}
                  </div>
                  {i.status === "PENDING" ? <PayButton installmentId={i.id} /> : <InstallmentBadge status={i.status} />}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Tarif {formatFcfa(t.hourlyRate)}/h · {t.sessionsPerWeek} × {t.hoursPerSession} h par semaine
            </p>
          </Card>
        </div>

        <div className="space-y-6 lg:order-1">
          <Card title={`Séances (${t.lessons.length})`} description="Confirmez chaque séance, ou signalez un problème.">
            {t.lessons.length === 0 ? (
              <EmptyState icon={NotebookPen} title="Pas encore de séance">
                Les comptes rendus apparaîtront ici dès que l&apos;éducateur les aura saisis.
              </EmptyState>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                {t.lessons.map((l) => (
                  <li key={l.id} className="relative">
                    <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-white ring-2 ring-brand-400" aria-hidden />
                    <div className="rounded-2xl border border-slate-200/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">
                          {formatDate(l.date)} · {TIME_SLOTS[l.slot]}
                        </p>
                        <LessonBadge status={l.status} />
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{l.workDone}</p>
                      {l.observation && <p className="mt-2 text-sm leading-relaxed text-slate-500 italic">« {l.observation} »</p>}
                      {l.parentComment && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Votre remarque : {l.parentComment}</p>}
                      {l.status === "RECORDED" && <LessonReview lessonId={l.id} />}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Votre avis sur l'éducateur">
            {t.review ? (
              <div>
                <Stars value={t.review.rating} size="md" />
                {t.review.comment && <p className="mt-2 text-[15px] text-slate-600">{t.review.comment}</p>}
              </div>
            ) : t.lessons.length > 0 ? (
              <EducatorReviewForm tutoringId={t.id} />
            ) : (
              <p className="text-sm text-slate-500">Vous pourrez noter l&apos;éducateur après la première séance.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
