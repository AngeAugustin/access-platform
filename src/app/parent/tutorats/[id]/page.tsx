import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader, Stars } from "@/components/ui";
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
      educator: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
      lessons: { orderBy: [{ date: "desc" }, { slot: "desc" }] },
      installments: { orderBy: { index: "asc" } },
      review: true,
    },
  });
  if (!t) notFound();
  const now = new Date();
  const total = t.installments.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <PageHeader title={`Tutorat de ${fullName(t.child)}`} subtitle={`Référence ${t.reference}`} back="/parent/tutorats" action={t.status === "ACTIVE" ? <StopTutoringForm tutoringId={t.id} /> : undefined} />
      {nouveau && (
        <p className="mb-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Tutorat créé. {fullName(t.educator.user)} a été prévenu. Les échéances sont listées ci-dessous.
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Contrat">
          <DefinitionList
            items={[
              ["Statut", <TutoringBadge key="s" status={t.status} />],
              ["Éducateur", `${fullName(t.educator.user)} · ${t.educator.user.phone}`],
              ["Période", `${formatDate(t.startDate)} → ${formatDate(t.endDate)} (${t.durationWeeks} sem.)`],
              ["Créneaux", t.slotsLabel],
              ["Tarif", `${formatFcfa(t.hourlyRate)}/h · ${t.sessionsPerWeek} × ${t.hoursPerSession} h par semaine`],
              ["Coût total", formatFcfa(total)],
              ...(t.stoppedAt ? ([["Arrêté le", `${formatDate(t.stoppedAt)} — ${t.stopReason}`]] as [string, string][]) : []),
            ]}
          />
        </Card>
        <Card title="Échéances">
          <ul className="divide-y divide-slate-100">
            {t.installments.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">
                    {i.index}. {formatFcfa(i.amount)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {i.weeks} semaine(s) · {i.status === "PAID" ? `payée le ${formatDate(i.paidAt)}` : `avant le ${formatDate(i.dueDate)}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                  {i.status === "PENDING" && <PayButton installmentId={i.id} />}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={`Séances (${t.lessons.length})`} className="lg:col-span-2">
          {t.lessons.length === 0 ? (
            <p className="text-sm text-slate-600">Les séances apparaîtront ici dès que l&apos;éducateur les aura saisies.</p>
          ) : (
            <ul className="space-y-3">
              {t.lessons.map((l) => (
                <li key={l.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {formatDate(l.date)} · {TIME_SLOTS[l.slot]}
                    </p>
                    <LessonBadge status={l.status} />
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{l.workDone}</p>
                  {l.observation && <p className="mt-1 whitespace-pre-line text-sm italic text-slate-600">Observation : {l.observation}</p>}
                  {l.parentComment && <p className="mt-1 text-sm text-red-700">Votre remarque : {l.parentComment}</p>}
                  {l.status === "RECORDED" && <LessonReview lessonId={l.id} />}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Votre avis sur l'éducateur" className="lg:col-span-2">
          {t.review ? (
            <div className="text-sm">
              <Stars value={t.review.rating} />
              {t.review.comment && <p className="mt-1 text-slate-700">{t.review.comment}</p>}
            </div>
          ) : t.lessons.length > 0 ? (
            <EducatorReviewForm tutoringId={t.id} />
          ) : (
            <p className="text-sm text-slate-600">Vous pourrez noter l&apos;éducateur après la première séance.</p>
          )}
        </Card>
      </div>
    </>
  );
}
