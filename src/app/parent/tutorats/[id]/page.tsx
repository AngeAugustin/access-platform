import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, MessageCircle, NotebookPen, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName, whatsappUrl } from "@/lib/format";
import { currentWeek, tutoringProgress } from "@/lib/progress";
import { nextSession } from "@/lib/schedule";
import { EmptyState, Notice, Stars, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { LessonBadge, TutoringBadge } from "@/components/status";
import { EducatorReviewForm, LessonReview, StopTutoringForm } from "@/components/parent/tutoring-actions";
import { PayButton } from "@/components/parent/pay-button";
import { ProgressRing, ScreenTitle, SectionHeading, darkPanel, display, panel } from "@/components/parent/kit";

export const metadata = { title: "Suivi de l'accompagnement" };

const dayMonth = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", day: "2-digit", month: "short" });
const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", weekday: "long" });

export default async function TutoringPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const user = await requireRole("PARENT");
  const { id } = await params;
  const { nouveau } = await searchParams;
  const t = await db.tutoring.findFirst({
    where: { id, parentId: user.id },
    include: {
      child: true,
      bookedSlots: { select: { day: true, slot: true } },
      educator: { include: { user: { select: { firstName: true, lastName: true, phone: true } }, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      lessons: { orderBy: [{ date: "desc" }, { slot: "desc" }] },
      installments: { orderBy: { index: "asc" } },
      review: true,
    },
  });
  if (!t) notFound();
  const now = new Date();
  const educatorName = fullName(t.educator.user);
  const total = t.installments.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.amount, 0);
  const paid = t.installments.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const progress = tutoringProgress(t.startDate, t.stoppedAt ?? t.endDate);
  const confirmed = t.lessons.filter((l) => l.status === "CONFIRMED").length;
  const pending = t.lessons.filter((l) => l.status === "RECORDED").length;
  const next = t.status === "ACTIVE" ? nextSession(t.bookedSlots, { start: t.startDate, end: t.endDate }, now) : null;
  const action = "flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition";

  return (
    <>
      <ScreenTitle back="/parent/tutorats" eyebrow={`Accompagnement de ${t.child.firstName} · réf. ${t.reference}`} title={educatorName} action={<TutoringBadge status={t.status} />} />
      {nouveau && (
        <div className="mb-5">
          <Notice tone="green" icon={CircleCheck} title="Accompagnement créé">
            {educatorName} a été prévenu. Vos échéances sont listées ci-dessous.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4 lg:order-2">
          <div className={cx(panel, "p-4")}>
            <div className="flex items-center gap-3.5">
              <Avatar name={educatorName} documentId={t.educator.documents[0]?.id} size={52} />
              <div className="min-w-0">
                <p className="truncate text-15px font-semibold text-ink">{t.slotsLabel}</p>
                <p className="mt-0.5 text-13px text-slate-500">
                  {formatDate(t.startDate)} → {formatDate(t.endDate)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={`tel:${t.educator.user.phone}`} className={cx(action, "bg-brand-600 text-white hover:bg-brand-700")}>
                <Phone className="size-[18px]" strokeWidth={1.9} aria-hidden /> Appeler
              </a>
              <a href={whatsappUrl(t.educator.user.phone)} target="_blank" rel="noopener noreferrer" className={cx(action, "bg-emerald-100 text-emerald-800 hover:bg-emerald-200")}>
                <MessageCircle className="size-[18px]" strokeWidth={1.9} aria-hidden /> WhatsApp
              </a>
              <Link href={`/parent/educateurs/${t.educatorId}`} className={cx(action, "bg-slate-100 text-ink hover:bg-slate-200")}>
                Profil
              </Link>
            </div>
          </div>

          <div className={cx(darkPanel, "flex items-center gap-4 p-4 pr-5")}>
            <ProgressRing percent={progress} />
            <div className="min-w-0">
              <p className={cx(display, "text-[22px] font-bold")}>
                {t.status === "ACTIVE" ? `Semaine ${currentWeek(t.startDate, t.durationWeeks, now)} sur ${t.durationWeeks}` : `${progress} % effectué`}
              </p>
              <p className="mt-0.5 text-13px text-brand-200">
                {confirmed} séance{confirmed > 1 ? "s" : ""} confirmée{confirmed > 1 ? "s" : ""}
                {pending > 0 && ` · ${pending} à confirmer`}
              </p>
              {next && (
                <p className="mt-1 text-13px font-semibold text-accent-300">
                  Prochaine : {next.when.toLowerCase()}, {next.hours}
                </p>
              )}
            </div>
          </div>

          {t.stoppedAt && (
            <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
              Arrêté le {formatDate(t.stoppedAt)} : {t.stopReason}
            </p>
          )}

          <section aria-labelledby="t-echeances">
            <SectionHeading id="t-echeances">Échéances</SectionHeading>
            <p className="-mt-2 mb-3 text-13px text-slate-500">
              {formatFcfa(paid)} payés sur {formatFcfa(total)} · {formatFcfa(t.hourlyRate)}/h, {t.sessionsPerWeek} × {t.hoursPerSession} h par semaine
            </p>
            <ul className="space-y-2">
              {t.installments.map((i) => {
                const late = i.status === "PENDING" && i.dueDate < now;
                return (
                  <li
                    key={i.id}
                    className={cx(
                      "flex items-center justify-between gap-3 rounded-[20px] p-3.5",
                      i.status === "PAID" ? "bg-emerald-50" : i.status === "PENDING" ? (late ? "bg-rose-50" : "bg-accent-50") : "bg-slate-100",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink tabular-nums">{formatFcfa(i.amount)}</p>
                      <p className={cx("text-xs", late ? "font-medium text-rose-700" : "text-slate-500")}>
                        N°{i.index} · {i.weeks} sem. ·{" "}
                        {i.status === "PAID" ? `payée le ${formatDate(i.paidAt)}` : i.status === "CANCELLED" ? "annulée" : `${late ? "en retard, " : ""}avant le ${formatDate(i.dueDate)}`}
                      </p>
                    </div>
                    {i.status === "PENDING" ? <PayButton installmentId={i.id} /> : i.status === "PAID" ? <CircleCheck className="size-5 text-emerald-600" aria-label="Payée" /> : null}
                  </li>
                );
              })}
            </ul>
          </section>

          {t.status === "ACTIVE" && (
            <div className="flex justify-center pt-1">
              <StopTutoringForm tutoringId={t.id} />
            </div>
          )}
        </div>

        <div className="space-y-5 lg:order-1">
          <section aria-labelledby="t-seances">
            <SectionHeading id="t-seances">Séances</SectionHeading>
            {t.lessons.length === 0 ? (
              <EmptyState icon={NotebookPen} title="Pas encore de séance">
                Les comptes rendus apparaîtront ici dès que l&apos;éducateur les aura saisis.
              </EmptyState>
            ) : (
              <ol className="space-y-2.5">
                {t.lessons.map((l) => (
                  <li key={l.id} id={`seance-${l.id}`} className={cx(panel, "scroll-mt-24 p-4", l.status === "RECORDED" && "shadow-[0_0_0_2px_var(--color-accent-300)]")}>
                    <div className="flex items-start gap-3">
                      <span className="w-11 shrink-0 text-center">
                        <span className={cx(display, "block text-xl leading-none font-bold text-ink")}>{dayMonth.format(l.date).split(" ")[0]}</span>
                        <span className="block text-11px text-slate-500 uppercase">{dayMonth.format(l.date).split(" ")[1]}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-13px text-slate-500 first-letter:uppercase">
                            {weekday.format(l.date)} · {TIME_SLOTS[l.slot]}
                          </p>
                          <LessonBadge status={l.status} />
                        </div>
                        <p className="mt-1.5 text-15px leading-relaxed whitespace-pre-line text-slate-800">{l.workDone}</p>
                        {l.observation && <p className="mt-2 text-sm leading-relaxed text-slate-500 italic">« {l.observation} »</p>}
                        {l.parentComment && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">Votre remarque : {l.parentComment}</p>}
                      </div>
                    </div>
                    {l.status === "RECORDED" && <LessonReview lessonId={l.id} />}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="t-avis" className={cx(panel, "p-5")}>
            <h2 id="t-avis" className={cx(display, "mb-3 text-lg font-bold text-ink")}>
              Votre avis sur {t.educator.user.firstName}
            </h2>
            {t.review ? (
              <div>
                <Stars value={t.review.rating} size="md" />
                {t.review.comment && <p className="mt-2 text-15px text-slate-600">{t.review.comment}</p>}
              </div>
            ) : t.lessons.length > 0 ? (
              <EducatorReviewForm tutoringId={t.id} />
            ) : (
              <p className="text-sm text-slate-500">Vous pourrez noter l&apos;éducateur après la première séance.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
