import { notFound } from "next/navigation";
import { House, Mail, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { requireTutorSpace } from "@/lib/auth/dal";
import { FOLLOW_UP_STATUS, TASK_KINDS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { addDays, localDate, recurrenceLabel, tutorShare } from "@/lib/follow-up";
import { Badge, Card, cx } from "@/components/ui";
import { BackLink, Info } from "@/components/admin/detail";
import { kindIcons, kindTones } from "@/components/follow-up/kind";
import { ReportFeed } from "@/components/follow-up/report-feed";
import { AcceptFollowUpButton, ReasonForm } from "@/components/tutor/follow-up-forms";

export const metadata = { title: "Suivi d'une famille" };

const tones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function TutorFamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTutorSpace();
  const { id } = await params;
  const f = await db.followUp.findFirst({
    where: { id, tutor: { userId: user.id } },
    include: {
      tutor: { select: { status: true } },
      parent: { select: { firstName: true, lastName: true, phone: true, email: true, address: true, city: true } },
      children: { include: { child: { select: { firstName: true, lastName: true, currentClass: true, currentSchool: true } } } },
      tasks: { where: { active: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!f) notFound();
  const now = new Date();
  const occurrences = await db.taskOccurrence.findMany({
    where: { task: { followUpId: f.id }, date: { gte: addDays(localDate(now), -30), lte: localDate(now) } },
    include: { child: { select: { firstName: true } }, task: { select: { kind: true, title: true } }, photos: { select: { id: true } } },
    orderBy: [{ date: "desc" }, { dueAt: "asc" }],
  });
  const childName = (ids: string[]) => f.children.filter((c) => ids.includes(c.childId)).map((c) => c.child.firstName).join(", ");

  return (
    <>
      <BackLink href="/tuteur/familles">Familles</BackLink>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Famille {f.parent.lastName}</h1>
        <Badge tone={tones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
        <span className="font-mono text-xs text-slate-400">{f.reference}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Card title="Actions demandées">
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
                        {childName(t.childIds)} · {recurrenceLabel(t)}
                        {t.photoRequired && " · photo demandée"}
                      </p>
                      {t.instructions && <p className="mt-1 text-13px text-slate-600">{t.instructions}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Derniers retours" description="Les 30 derniers jours.">
            {occurrences.length === 0 ? <p className="text-sm text-slate-500">Aucune action pour le moment.</p> : <ReportFeed occurrences={occurrences} now={now} />}
          </Card>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title="Parent">
            <dl className="space-y-3 text-sm">
              <Info icon={House} label="Adresse" value={[f.parent.address, f.parent.city].filter(Boolean).join(", ") || "-"} />
              <Info icon={Phone} label="Téléphone" value={f.status === "ACTIVE" ? f.parent.phone : "Visible une fois le suivi accepté"} />
              <Info icon={Mail} label="E-mail" value={f.status === "ACTIVE" ? f.parent.email : "-"} />
            </dl>
            <p className="mt-4 text-sm text-slate-600">{fullName(f.parent)}</p>
          </Card>
          <Card title="Enfants">
            <ul className="space-y-2 text-sm">
              {f.children.map((c) => (
                <li key={c.childId}>
                  <span className="font-medium text-ink">{fullName(c.child)}</span>
                  <span className="block text-13px text-slate-500">
                    {c.child.currentClass}
                    {c.child.currentSchool && ` · ${c.child.currentSchool}`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Forfait">
            <p className="text-2xl font-semibold text-ink tabular-nums">{formatFcfa(tutorShare(f.monthlyPrice, f.commissionPercent))}</p>
            <p className="text-13px text-slate-500">pour vous chaque mois · début le {formatDate(f.startDate)}</p>
            {f.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">« {f.message} »</p>}
            {f.status === "REQUESTED" && (
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
                {f.tutor.status === "VALIDATED" && <AcceptFollowUpButton followUpId={f.id} />}
                <ReasonForm followUpId={f.id} kind="decline" />
              </div>
            )}
            {f.status === "ACTIVE" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ReasonForm followUpId={f.id} kind="end" />
              </div>
            )}
            {(f.endReason || f.declineReason) && <p className="mt-3 text-13px text-slate-500">Motif : {f.endReason ?? f.declineReason}</p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
