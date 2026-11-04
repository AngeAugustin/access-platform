import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { FOLLOW_UP_STATUS, TASK_KINDS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { addDays, localDate, recurrenceLabel } from "@/lib/follow-up";
import { Badge, LinkButton, Notice, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { KidChips, ScreenTitle, SectionHeading, display, panel } from "@/components/parent/kit";
import { kindIcons, kindTones } from "@/components/follow-up/kind";
import { ReportFeed } from "@/components/follow-up/report-feed";
import { CancelFollowUpRequestButton, EditTasksForm, EndFollowUpForm, OccurrenceFeedback } from "@/components/parent/follow-up-forms";

export const metadata = { title: "Suivi" };

const tones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function ParentFollowUpPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enfant?: string }> }) {
  const parent = await requireRole("PARENT");
  const { id } = await params;
  const { enfant } = await searchParams;
  const f = await db.followUp.findFirst({
    where: { id, parentId: parent.id },
    include: {
      tutor: { include: { user: { select: { firstName: true, lastName: true, phone: true } }, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      children: { include: { child: { select: { id: true, firstName: true, lastName: true, currentClass: true } } }, orderBy: { child: { firstName: "asc" } } },
      tasks: { where: { active: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!f) notFound();
  const now = new Date();
  const today = localDate(now);
  const kids = f.children.map((c) => c.child);
  const kid = kids.find((k) => k.id === enfant);
  const [occurrences, week] = await Promise.all([
    db.taskOccurrence.findMany({
      where: { task: { followUpId: f.id }, date: { gte: addDays(today, -30), lte: today }, ...(kid && { childId: kid.id }) },
      include: { child: { select: { firstName: true } }, task: { select: { kind: true, title: true } }, photos: { select: { id: true } } },
      orderBy: [{ date: "desc" }, { dueAt: "asc" }],
    }),
    db.taskOccurrence.findMany({ where: { task: { followUpId: f.id }, date: { gte: addDays(today, -7), lt: today } }, select: { status: true } }),
  ]);
  const done = week.filter((o) => o.status === "DONE" || o.status === "PARTIAL").length;
  const missed = week.filter((o) => o.status === "MISSED" || o.status === "PENDING").length;
  const unread = occurrences.filter((o) => o.reportedAt && !o.parentSeenAt).length;
  const tutorName = fullName(f.tutor.user);
  const childName = (ids: string[]) => kids.filter((k) => ids.includes(k.id)).map((k) => k.firstName).join(", ");
  const tasksKey = JSON.stringify(f.tasks.map((t) => [t.id, t.title, t.instructions, t.childIds, t.days, t.intervalWeeks, t.dueHour, t.photoRequired]));

  return (
    <>
      <ScreenTitle back="/parent/suivi" eyebrow={<span className="font-mono text-xs">{f.reference}</span>} title={`Suivi de ${kids.map((k) => k.firstName).join(" et ")}`} />

      <div className="mb-5 space-y-3 empty:hidden">
        {f.status === "REQUESTED" && (
          <Notice tone="amber" title="En attente du tuteur" action={<CancelFollowUpRequestButton followUpId={f.id} />}>
            {f.tutor.user.firstName} a reçu votre demande et vous répond rapidement. Vous pouvez encore ajuster les actions.
          </Notice>
        )}
        {f.status === "DECLINED" && (
          <Notice tone="red" title="Demande refusée" action={<LinkButton href="/parent/tuteurs" size="sm" variant="secondary">Choisir un autre tuteur</LinkButton>}>
            {f.declineReason}
          </Notice>
        )}
        {f.status === "ENDED" && <Notice title={`Suivi terminé le ${formatDate(f.endedAt)}`}>{f.endReason}</Notice>}
        {f.status === "CANCELLED" && <Notice title="Demande retirée" />}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          {f.status === "ACTIVE" && (
            <dl className="grid grid-cols-3 gap-2.5">
              {[
                { label: "faites (7 j)", value: `${done}/${week.length}` },
                { label: "sans retour (7 j)", value: missed, alert: missed > 0 },
                { label: "à lire", value: unread },
              ].map((m) => (
                <div key={m.label} className={cx(panel, "flex flex-col-reverse p-3.5 text-center")}>
                  <dt className="text-xs text-slate-500">{m.label}</dt>
                  <dd className={cx(display, "text-2xl font-bold", m.alert ? "text-rose-600" : "text-ink")}>{m.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <section aria-labelledby="t-retours">
            <SectionHeading id="t-retours">Retours du tuteur</SectionHeading>
            {kids.length > 1 && <KidChips kids={kids} current={kid?.id} all="Tous" hrefFor={(k) => (k ? `/parent/suivi/${f.id}?enfant=${k}` : `/parent/suivi/${f.id}`)} />}
            {occurrences.length === 0 ? (
              <div className={cx(panel, "p-5 text-sm text-slate-500")}>{f.status === "ACTIVE" ? "Les premiers retours arriveront après les premières actions." : f.status === "REQUESTED" ? "Les retours apparaîtront ici dès que le tuteur aura accepté le suivi." : "Aucun retour."}</div>
            ) : (
              <ReportFeed occurrences={occurrences} now={now} footer={(o) => (o.reportedAt ? <OccurrenceFeedback occurrenceId={o.id} seen={Boolean(o.parentSeenAt)} /> : null)} />
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <section className={cx(panel, "p-5")}>
            <div className="flex items-center gap-3">
              <Avatar name={tutorName} documentId={f.tutor.documents[0]?.id} size={52} />
              <div className="min-w-0 flex-1">
                <p className="text-15px font-semibold text-ink">{tutorName}</p>
                <p className="text-13px text-slate-500">Tuteur · {f.status === "ACTIVE" ? f.tutor.user.phone : "vérifié par Access"}</p>
              </div>
              <Badge tone={tones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Forfait mensuel</span>
              <span className="text-lg font-semibold text-ink tabular-nums">{formatFcfa(f.monthlyPrice)}</span>
            </div>
            <p className="mt-1 text-13px text-slate-500">Depuis le {formatDate(f.startDate)}</p>
            {f.status === "ACTIVE" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <EndFollowUpForm followUpId={f.id} />
              </div>
            )}
          </section>

          <section className={cx(panel, "p-5")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-15px font-semibold text-ink">Actions demandées</h2>
            </div>
            <ul className="space-y-3">
              {f.tasks.map((t) => {
                const Icon = kindIcons[t.kind];
                return (
                  <li key={t.id} className="flex gap-3">
                    <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-xl", kindTones[t.kind])} aria-hidden>
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{t.title || TASK_KINDS[t.kind]}</p>
                      <p className="text-13px text-slate-500">
                        {kids.length > 1 && `${childName(t.childIds)} · `}
                        {recurrenceLabel(t)}
                        {t.photoRequired && " · photo"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {(f.status === "ACTIVE" || f.status === "REQUESTED") && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <EditTasksForm key={tasksKey} followUpId={f.id} kids={kids} tasks={f.tasks} />
              </div>
            )}
          </section>
          {f.status !== "ACTIVE" && f.status !== "REQUESTED" && (
            <p className="text-center text-sm">
              <Link href="/parent/tuteurs" className="font-semibold text-brand-700 hover:text-brand-800">
                Demander un nouveau suivi
              </Link>
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
