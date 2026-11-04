import Link from "next/link";
import { CalendarCheck, Camera, ChevronRight, Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { requireTutorSpace } from "@/lib/auth/dal";
import { OCCURRENCE_RESULTS, REPORT_GRACE_HOURS, TASK_KINDS } from "@/lib/constants";
import { localDate, occurrenceState } from "@/lib/follow-up";
import { ensureOccurrences } from "@/server/services/follow-up";
import { Badge, EmptyState, LinkButton, Notice, PageHeader, cx } from "@/components/ui";
import { kindIcons, kindTones } from "@/components/follow-up/kind";
import { ReportButton } from "@/components/tutor/follow-up-forms";

export const metadata = { title: "Aujourd'hui" };

const dayLabel = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", weekday: "long", day: "numeric", month: "long" });
const shortDay = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "short" });
const hour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", hour: "numeric" });
const resultTones = { DONE: "green", PARTIAL: "amber", NOT_DONE: "red" } as const;

export default async function TutorTodayPage() {
  const user = await requireTutorSpace();
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
  const now = new Date();
  const title = dayLabel.format(now);
  const header = <PageHeader title="Aujourd'hui" subtitle={title.charAt(0).toUpperCase() + title.slice(1)} />;

  if (!profile) {
    return (
      <>
        {header}
        <EmptyState icon={CalendarCheck} title="Vous n'êtes pas encore tuteur" action={<LinkButton href="/tuteur/dossier">Devenir tuteur</LinkButton>}>
          Accompagnez des familles au quotidien : leçons du soir, devoirs, visites à l&apos;école.
        </EmptyState>
      </>
    );
  }

  await ensureOccurrences({ tutorId: profile.id }, now);
  const today = localDate(now);
  const lateLimit = new Date(now.getTime() - REPORT_GRACE_HOURS * 3600_000);
  const [occurrences, requests] = await Promise.all([
    db.taskOccurrence.findMany({
      where: {
        task: { followUp: { tutorId: profile.id, status: "ACTIVE" } },
        OR: [{ date: today }, { date: { lt: today }, status: "PENDING", dueAt: { gte: lateLimit } }],
      },
      include: {
        child: { select: { firstName: true } },
        task: { select: { kind: true, title: true, instructions: true, photoRequired: true, followUp: { select: { id: true, parent: { select: { lastName: true, address: true, city: true } } } } } },
        _count: { select: { photos: true } },
      },
      orderBy: [{ dueAt: "asc" }],
    }),
    db.followUp.count({ where: { tutorId: profile.id, status: "REQUESTED" } }),
  ]);

  const families = new Map<string, { name: string; place: string; items: typeof occurrences }>();
  for (const o of occurrences) {
    const f = o.task.followUp;
    const entry = families.get(f.id) ?? { name: `Famille ${f.parent.lastName}`, place: [f.parent.address, f.parent.city].filter(Boolean).join(", "), items: [] };
    entry.items.push(o);
    families.set(f.id, entry);
  }
  const pending = occurrences.filter((o) => o.status === "PENDING").length;

  return (
    <>
      {header}
      <div className="mb-5 space-y-3 empty:hidden">
        {profile.status !== "VALIDATED" && (
          <Notice tone="amber" title="Dossier en attente" action={<LinkButton href="/tuteur/dossier" size="sm" variant="secondary">Mon dossier</LinkButton>}>
            Les familles vous trouveront dans le catalogue dès qu&apos;Access aura validé votre dossier.
          </Notice>
        )}
        {requests > 0 && (
          <Notice tone="blue" title={`${requests} demande${requests > 1 ? "s" : ""} de suivi`} action={<LinkButton href="/tuteur/familles" size="sm">Répondre</LinkButton>}>
            Des parents attendent votre réponse.
          </Notice>
        )}
      </div>

      {occurrences.length === 0 ? (
        <EmptyState icon={Inbox} title="Rien de prévu aujourd'hui">
          Les actions demandées par les familles apparaissent ici le jour venu.
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {pending === 0 ? "Tous les retours sont envoyés. Merci !" : `${pending} retour${pending > 1 ? "s" : ""} à faire`}
          </p>
          <div className="space-y-5">
            {[...families.entries()].map(([id, f]) => (
              <section key={id} className="rounded-2xl border border-slate-200/80 bg-white shadow-soft">
                <Link href={`/tuteur/familles/${id}`} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-15px font-semibold text-ink">{f.name}</span>
                    {f.place && <span className="block truncate text-13px text-slate-500">{f.place}</span>}
                  </span>
                  <ChevronRight className="size-5 text-slate-400" aria-hidden />
                </Link>
                <ul className="divide-y divide-slate-100">
                  {f.items.map((o) => {
                    const state = occurrenceState(o, now);
                    const Icon = kindIcons[o.task.kind];
                    const taskTitle = o.task.title || TASK_KINDS[o.task.kind];
                    const earlier = o.date < today;
                    return (
                      <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-xl", kindTones[o.task.kind])} aria-hidden>
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {o.child.firstName} · {taskTitle}
                          </p>
                          <p className="text-13px text-slate-500">
                            {earlier ? `${shortDay.format(o.date)}, ` : ""}avant {hour.format(o.dueAt)}
                            {o.task.photoRequired && (
                              <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                                <Camera className="size-3.5" aria-hidden /> photo
                              </span>
                            )}
                          </p>
                          {o.task.instructions && state === "todo" && <p className="mt-1 text-13px text-slate-600">{o.task.instructions}</p>}
                        </div>
                        {state === "todo" || state === "late" ? (
                          <span className="flex items-center gap-2">
                            {state === "late" && <Badge tone="red">En retard</Badge>}
                            <ReportButton occurrenceId={o.id} title={taskTitle} childName={o.child.firstName} photoRequired={o.task.photoRequired} schoolVisit={o.task.kind === "SCHOOL_VISIT"} late={state === "late"} />
                          </span>
                        ) : state === "missed" ? (
                          <Badge tone="gray">Manquée</Badge>
                        ) : (
                          <span className="flex items-center gap-2">
                            {o._count.photos > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Camera className="size-3.5" aria-hidden /> {o._count.photos}
                              </span>
                            )}
                            <Badge tone={resultTones[state]}>{OCCURRENCE_RESULTS[state]}</Badge>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
