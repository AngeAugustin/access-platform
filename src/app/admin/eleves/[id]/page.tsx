import { notFound } from "next/navigation";
import { BookOpenCheck, Cake, CalendarDays, GraduationCap, History, NotebookPen, School } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECT_LEVELS, TIME_SLOTS } from "@/lib/constants";
import { subjectLabel, subjectsForClass } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";
import { age, formatDate, fullName } from "@/lib/format";
import { Card, cx } from "@/components/ui";
import { LessonBadge } from "@/components/status";
import { Avatar } from "@/components/avatar";
import { BackLink, DetailHeader, Empty, MetaItem, Metric, PersonLink, TutoringRow } from "@/components/admin/detail";

export const metadata = { title: "Fiche élève" };

type Level = keyof typeof SUBJECT_LEVELS;

// Rang de chaque niveau sur la jauge à 4 crans, et couleur associée.
const levelRank: Record<Level, number> = { WEAK: 1, AVERAGE: 2, GOOD: 3, VERY_GOOD: 4 };
const levelTone: Record<Level, string> = { WEAK: "bg-rose-400", AVERAGE: "bg-amber-400", GOOD: "bg-emerald-400", VERY_GOOD: "bg-emerald-500" };
const lessonDot = { RECORDED: "bg-amber-400", CONFIRMED: "bg-emerald-500", DISPUTED: "bg-rose-500" } as const;

const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

export default async function AdminChildPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const child = await db.child.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, firstName: true, lastName: true, phone: true } },
      subjectLevels: true,
      tutorings: { include: { educator: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { startDate: "desc" } },
    },
  });
  if (!child) notFound();
  const [curriculum, lessons, recentLessons] = await Promise.all([
    getCurriculum(),
    db.lesson.findMany({ where: { tutoring: { childId: child.id } }, select: { status: true, tutoring: { select: { hoursPerSession: true } } } }),
    db.lesson.findMany({
      where: { tutoring: { childId: child.id } },
      orderBy: [{ date: "desc" }, { slot: "desc" }],
      take: 10,
      include: { tutoring: { select: { educator: { select: { user: { select: { firstName: true, lastName: true } } } } } } },
    }),
  ]);

  const now = new Date();
  const name = fullName(child);
  const active = child.tutorings.find((t) => t.status === "ACTIVE");
  const done = lessons.filter((l) => l.status !== "DISPUTED");
  const hours = done.reduce((s, l) => s + l.tutoring.hoursPerSession, 0);
  const toConfirm = lessons.filter((l) => l.status === "RECORDED").length;
  const disputed = lessons.filter((l) => l.status === "DISPUTED").length;
  // Matières dans l'ordre du référentiel pour la classe, puis celles qui n'y figurent plus.
  const order = subjectsForClass(curriculum, child.currentClass);
  const levels = [...child.subjectLevels].sort((a, b) => {
    const ia = order.indexOf(a.subject);
    const ib = order.indexOf(b.subject);
    return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
  });

  return (
    <>
      <BackLink href="/admin/eleves">Élèves</BackLink>
      <DetailHeader
        avatar={<Avatar name={name} size={72} />}
        title={name}
        badges={<span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{child.currentClass}</span>}
        meta={
          <>
            {child.currentSchool && <MetaItem icon={School}>{child.currentSchool}</MetaItem>}
            <MetaItem icon={Cake}>
              {child.sex === "F" ? "Fille" : "Garçon"} · {age(child.birthDate, now)} ans
            </MetaItem>
            <MetaItem icon={CalendarDays}>Inscrit le {formatDate(child.createdAt)}</MetaItem>
          </>
        }
        actions={<PersonLink href={`/admin/parents/${child.parent.id}`} name={fullName(child.parent)} label="Parent" meta={child.parent.phone} />}
        metrics={
          <>
            <Metric label="Accompagnement" tone={active ? "green" : undefined}>
              {active ? "En cours" : <span className="text-slate-400">Aucun</span>}
            </Metric>
            <Metric label="Séances faites">
              {done.length} <span className="text-sm font-normal text-slate-400">· {hours} h de cours</span>
            </Metric>
            <Metric label="À confirmer" tone={toConfirm ? "amber" : undefined}>
              {toConfirm}
            </Metric>
            <Metric label="Contestées" tone={disputed ? "red" : undefined}>
              {disputed}
            </Metric>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card title="Niveau par matière" description="Indiqué par le parent à l'inscription.">
            {levels.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun niveau renseigné.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {levels.map((l) => (
                  <li key={l.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">{subjectLabel(curriculum, l.subject)}</span>
                      <span className={cx("shrink-0 text-13px", l.level === "WEAK" ? "font-medium text-rose-600" : "text-slate-500")}>{SUBJECT_LEVELS[l.level]}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden>
                      {[1, 2, 3, 4].map((i) => (
                        <span key={i} className={cx("h-1.5 rounded-full", i <= levelRank[l.level] ? levelTone[l.level] : "bg-slate-100")} />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Accompagnements">
            {child.tutorings.length === 0 ? (
              <Empty icon={BookOpenCheck} title="Aucun accompagnement">
                Le parent n&apos;a pas encore demandé d&apos;accompagnement pour cet enfant.
              </Empty>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {child.tutorings.map((t) => (
                  <TutoringRow key={t.id} tutoring={t} now={now} person={fullName(t.educator.user)} title={fullName(t.educator.user)} meta={`${t.classLevel} · ${t.slotsLabel}`} />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Dernières séances" action={recentLessons.length >= 10 ? <span className="text-xs text-slate-400">10 dernières</span> : undefined}>
            {recentLessons.length === 0 ? (
              <Empty icon={NotebookPen} title="Aucune séance enregistrée">
                Les comptes rendus des éducateurs apparaîtront ici.
              </Empty>
            ) : (
              <ol className="ml-1.5 space-y-5 border-l border-slate-200 pl-5">
                {recentLessons.map((l) => (
                  <li key={l.id} className="relative">
                    <span className={cx("absolute top-1 -left-[26.5px] size-3 rounded-full ring-4 ring-white", lessonDot[l.status])} aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink first-letter:uppercase">
                        {weekday.format(l.date)} · {TIME_SLOTS[l.slot]}
                      </p>
                      <LessonBadge status={l.status} />
                      <span className="text-xs text-slate-400">{fullName(l.tutoring.educator.user)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-slate-600">{l.workDone}</p>
                    {l.observation && <p className="mt-1 text-13px text-slate-500 italic">« {l.observation} »</p>}
                    {l.parentComment && (
                      <p className="mt-1 text-13px text-rose-700">
                        <span className="font-medium">Parent :</span> {l.parentComment}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title="Scolarité">
            <div className="space-y-3">
              <SchoolYear icon={GraduationCap} label="Cette année" value={[child.currentClass, child.currentSchool].filter(Boolean).join(" · ")} current />
              {(child.previousClass || child.previousSchool) && (
                <SchoolYear icon={History} label="L'an dernier" value={[child.previousClass, child.previousSchool].filter(Boolean).join(" · ")} />
              )}
            </div>
          </Card>

          <Card title="Profil">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-13px text-slate-500">Matières préférées</dt>
                <dd className="mt-0.5 font-medium text-ink">{child.favoriteSubjects || "-"}</dd>
              </div>
              <div>
                <dt className="text-13px text-slate-500">Centres d&apos;intérêt</dt>
                <dd className="mt-0.5 font-medium text-ink">{child.interests || "-"}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <dt className="text-13px text-slate-500">{child.sex === "F" ? "Née le" : "Né le"}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{formatDate(child.birthDate)}</dd>
                </div>
                <div>
                  <dt className="text-13px text-slate-500">NPI</dt>
                  <dd className="mt-0.5 font-medium text-ink tabular-nums">{child.npi || "-"}</dd>
                </div>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}

function SchoolYear({ icon: Icon, label, value, current = false }: { icon: typeof GraduationCap; label: string; value: string; current?: boolean }) {
  return (
    <div className={cx("flex items-center gap-3 rounded-xl p-3", current ? "bg-brand-50/60" : "bg-slate-50")}>
      <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-lg bg-white", current ? "text-brand-600" : "text-slate-400")} aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
