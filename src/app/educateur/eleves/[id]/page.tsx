import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, SUBJECT_LEVELS, TIME_SLOTS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader } from "@/components/ui";
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
      <PageHeader title={fullName(t.child)} subtitle={`${t.classLevel} · ${t.slotsLabel}`} back="/educateur/eleves" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Élève et famille">
          <DefinitionList
            items={[
              ["Statut", <TutoringBadge key="s" status={t.status} />],
              ["Période", `${formatDate(t.startDate)} → ${formatDate(t.endDate)}`],
              ["École", t.child.currentSchool ?? "—"],
              ["Matières préférées", t.child.favoriteSubjects ?? "—"],
              ["Centres d'intérêt", t.child.interests ?? "—"],
              ["Parent", `${fullName(t.parent)} · ${t.parent.phone}`],
              ["Adresse", [t.parent.address, t.parent.city].filter(Boolean).join(", ") || "—"],
            ]}
          />
          <h3 className="mt-4 text-sm font-semibold">Niveau par matière</h3>
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {t.child.subjectLevels.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 rounded bg-slate-50 px-2 py-1">
                <span>{SUBJECTS[l.subject as SubjectKey] ?? l.subject}</span>
                <span className="font-medium">{SUBJECT_LEVELS[l.level]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Saisir une séance">
          {canRecord ? (
            <LessonForm tutoringId={t.id} childName={fullName(t.child)} minDate={t.startDate.toISOString().slice(0, 10)} maxDate={end.toISOString().slice(0, 10)} />
          ) : (
            <p className="text-sm text-slate-600">Ce tutorat est clôturé.</p>
          )}
        </Card>
        <Card title={`Séances (${t.lessons.length})`} className="lg:col-span-2">
          {t.lessons.length === 0 ? (
            <p className="text-sm text-slate-600">Aucune séance saisie.</p>
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
                  <p className="mt-1 whitespace-pre-line text-sm">{l.workDone}</p>
                  {l.observation && <p className="mt-1 text-sm italic text-slate-600">{l.observation}</p>}
                  {l.parentComment && <p className="mt-1 text-sm text-red-700">Remarque du parent : {l.parentComment}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
