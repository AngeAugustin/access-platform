import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { FOLLOW_UP_STATUS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { addDays, localDate } from "@/lib/follow-up";
import { Badge, LinkButton, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ScreenTitle, panel } from "@/components/parent/kit";

export const metadata = { title: "Suivi" };

const tones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function ParentFollowUpsPage() {
  const parent = await requireRole("PARENT");
  const followUps = await db.followUp.findMany({
    where: { parentId: parent.id },
    include: {
      tutor: { include: { user: { select: { firstName: true, lastName: true } }, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      children: { include: { child: { select: { firstName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const [unseen, week] = await Promise.all([
    db.taskOccurrence.findMany({ where: { reportedAt: { not: null }, parentSeenAt: null, task: { followUp: { parentId: parent.id } } }, select: { task: { select: { followUpId: true } } } }),
    db.taskOccurrence.findMany({
      where: { date: { gte: addDays(localDate(now), -7), lt: localDate(now) }, task: { followUp: { parentId: parent.id, status: "ACTIVE" } } },
      select: { status: true, task: { select: { followUpId: true } } },
    }),
  ]);
  const open = followUps.filter((f) => f.status === "ACTIVE" || f.status === "REQUESTED");
  const closed = followUps.filter((f) => !open.includes(f));

  const card = (f: (typeof followUps)[number]) => {
    const unread = unseen.filter((u) => u.task.followUpId === f.id).length;
    const w = week.filter((o) => o.task.followUpId === f.id);
    const done = w.filter((o) => o.status === "DONE" || o.status === "PARTIAL").length;
    return (
      <li key={f.id}>
        <Link href={`/parent/suivi/${f.id}`} className={cx(panel, "flex items-center gap-3 p-4 transition hover:shadow-lift")}>
          <Avatar name={fullName(f.tutor.user)} documentId={f.tutor.documents[0]?.id} size={48} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-15px font-semibold text-ink">{f.children.map((c) => c.child.firstName).join(", ")}</span>
              <Badge tone={tones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
            </span>
            <span className="mt-0.5 block truncate text-13px text-slate-500">
              {f.tutor.user.firstName} {f.tutor.user.lastName.charAt(0)}. · {formatFcfa(f.monthlyPrice)} / mois · depuis le {formatDate(f.status === "REQUESTED" ? f.createdAt : f.startDate)}
            </span>
            {f.status === "ACTIVE" && (
              <span className="mt-1 block text-13px">
                {unread > 0 ? <span className="font-semibold text-brand-700">{unread} retour{unread > 1 ? "s" : ""} à lire</span> : <span className="text-slate-500">Tout est lu</span>}
                {w.length > 0 && <span className="text-slate-500"> · {done}/{w.length} faites cette semaine</span>}
              </span>
            )}
          </span>
          <ChevronRight className="size-5 text-slate-400" aria-hidden />
        </Link>
      </li>
    );
  };

  return (
    <>
      <ScreenTitle eyebrow="Leçons, devoirs, visites à l'école" title="Suivi" action={<LinkButton href="/parent/tuteurs" size="sm">Trouver un tuteur</LinkButton>} />
      {followUps.length === 0 ? (
        <section className={cx(panel, "p-6 text-center")}>
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-700" aria-hidden>
            <ListChecks className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Confiez le suivi du quotidien</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Un tuteur vérifié vérifie les leçons, les devoirs, passe à l&apos;école consulter les notes. Vous choisissez les actions, il vous fait un retour à chaque fois.
          </p>
          <LinkButton href="/parent/tuteurs" className="mt-5">
            Trouver un tuteur
          </LinkButton>
        </section>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && <ul className="space-y-2.5">{open.map(card)}</ul>}
          {closed.length > 0 && (
            <section>
              <h2 className="mb-2 text-13px font-semibold text-slate-500">Terminés</h2>
              <ul className="space-y-2.5">{closed.map(card)}</ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}
