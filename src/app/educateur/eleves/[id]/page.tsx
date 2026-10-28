import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, SUBJECT_LEVELS, TIME_SLOTS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { LessonBadge, TutoringBadge } from "@/components/status";
import { LessonForm } from "@/components/educator/lesson-form";

export const metadata = { title: "Suivi de l'élève" };

// Les séances oubliées peuvent être saisies jusqu'à 7 jours après la fin du tutorat.
function withinGracePeriod(end: Date) {
  return Date.now() - end.getTime() <= 7 * 864e5;
}

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("EDUCATOR");
  const { id } = await params;
  const t = await db.tutoring.findFirst({
    where: { id, educator: { userId: user.id } },
    include: {
      child: { include: { subjectLevels: true } },
      parent: { select: { firstName: true, lastName: true, phone: true, address: true, city: true } },
      lessons: { orderBy: [{ date: "desc" }, { slot: "desc" }] },
    },
  });
  if (!t) notFound();
  const end = t.stoppedAt ?? t.endDate;
  const canRecord = t.status === "ACTIVE" || withinGracePeriod(end);

  return (
    <>
      <PageHeader
        back="/educateur/eleves"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={fullName(t.child)} size={44} />
            {fullName(t.child)}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <TutoringBadge status={t.status} />
            <span>
              {t.classLevel} · {t.slotsLabel}
            </span>
          </span>
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6 lg:order-2">
          <Card title="Saisir une séance" description="Le parent est notifié et confirme la séance." className="lg:sticky lg:top-24">
            {canRecord ? (
              <LessonForm tutoringId={t.id} childName={fullName(t.child)} minDate={t.startDate.toISOString().slice(0, 10)} maxDate={end.toISOString().slice(0, 10)} />
            ) : (
              <p className="text-sm text-slate-500">Ce tutorat est clôturé.</p>
            )}
          </Card>
        </div>
        <div className="space-y-6 lg:order-1">
          <Card title="Élève et famille">
            <DefinitionList
              items={[
                ["Période", `${formatDate(t.startDate)} → ${formatDate(t.endDate)}`],
                ["École", t.child.currentSchool ?? "—"],
                ["Parent", fullName(t.parent)],
                ["Téléphone", <a key="tel" href={`tel:${t.parent.phone}`} className="text-brand-700 hover:text-brand-800">{t.parent.phone}</a>],
                ["Adresse", [t.parent.address, t.parent.city].filter(Boolean).join(", ") || "—"],
                ["Centres d'intérêt", t.child.interests ?? "—"],
              ]}
            />
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="mb-3 text-[13px] text-slate-500">Niveau par matière</h3>
              <div className="flex flex-wrap gap-2">
                {t.child.subjectLevels.map((l) => (
                  <span key={l.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[13px] ring-1 ring-slate-200/70 ring-inset">
                    <span className="text-slate-600">{SUBJECTS[l.subject as SubjectKey] ?? l.subject}</span>
                    <span className="font-medium text-ink">{SUBJECT_LEVELS[l.level]}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>
          <Card title={`Séances (${t.lessons.length})`}>
            {t.lessons.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune séance saisie.</p>
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
                      {l.observation && <p className="mt-2 text-sm text-slate-500 italic">« {l.observation} »</p>}
                      {l.parentComment && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Remarque du parent : {l.parentComment}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
