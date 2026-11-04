import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireTutorSpace } from "@/lib/auth/dal";
import { FOLLOW_UP_STATUS, TASK_KINDS } from "@/lib/constants";
import { formatDate, formatFcfa } from "@/lib/format";
import { recurrenceLabel, tutorShare } from "@/lib/follow-up";
import { Badge, EmptyState, LinkButton, PageHeader, Tabs, cx } from "@/components/ui";
import { kindIcons, kindTones } from "@/components/follow-up/kind";
import { AcceptFollowUpButton, ReasonForm } from "@/components/tutor/follow-up-forms";

export const metadata = { title: "Familles" };

const tones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function TutorFamiliesPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const user = await requireTutorSpace();
  const profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
  if (!profile) {
    return (
      <>
        <PageHeader title="Familles" />
        <EmptyState icon={Users} title="Vous n'êtes pas encore tuteur" action={<LinkButton href="/tuteur/dossier">Devenir tuteur</LinkButton>} />
      </>
    );
  }
  const { onglet } = await searchParams;
  const tab = onglet === "clos" ? "clos" : "en-cours";
  const followUps = await db.followUp.findMany({
    where: { tutorId: profile.id, status: tab === "clos" ? { in: ["DECLINED", "CANCELLED", "ENDED"] } : { in: ["REQUESTED", "ACTIVE"] } },
    include: {
      parent: { select: { firstName: true, lastName: true, city: true, address: true } },
      children: { include: { child: { select: { firstName: true, currentClass: true, currentSchool: true } } } },
      tasks: { where: { active: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });
  const requests = followUps.filter((f) => f.status === "REQUESTED");
  const others = followUps.filter((f) => f.status !== "REQUESTED");

  return (
    <>
      <PageHeader title="Familles" subtitle="Les parents qui vous confient le suivi de leurs enfants." />
      <Tabs
        label="Familles"
        current={tab}
        items={[
          { key: "en-cours", href: "/tuteur/familles", label: "En cours" },
          { key: "clos", href: "/tuteur/familles?onglet=clos", label: "Terminés" },
        ]}
      />

      {followUps.length === 0 && <EmptyState icon={Users} title={tab === "clos" ? "Aucun suivi terminé" : "Aucune famille pour le moment"}>{tab === "clos" ? undefined : "Les demandes des parents apparaîtront ici."}</EmptyState>}

      {requests.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-15px font-semibold text-ink">Demandes à traiter</h2>
          <div className="space-y-3">
            {requests.map((f) => (
              <article key={f.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-15px font-semibold text-ink">
                      {f.parent.firstName} {f.parent.lastName}
                    </p>
                    <p className="text-13px text-slate-500">
                      {[f.parent.address, f.parent.city].filter(Boolean).join(", ") || "Adresse non précisée"} · début le {formatDate(f.startDate)}
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block text-lg font-semibold text-ink tabular-nums">{formatFcfa(tutorShare(f.monthlyPrice, f.commissionPercent))}</span>
                    <span className="block text-xs text-slate-500">pour vous, par mois</span>
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {f.children.map((c) => `${c.child.firstName} (${c.child.currentClass}${c.child.currentSchool ? `, ${c.child.currentSchool}` : ""})`).join(" · ")}
                </p>
                {f.message && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">« {f.message} »</p>}
                <ul className="mt-3 space-y-1.5">
                  {f.tasks.map((t) => {
                    const Icon = kindIcons[t.kind];
                    return (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span className={cx("flex size-7 shrink-0 items-center justify-center rounded-lg", kindTones[t.kind])} aria-hidden>
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium text-ink">{t.title || TASK_KINDS[t.kind]}</span> <span className="text-slate-500">· {recurrenceLabel(t)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
                  {profile.status === "VALIDATED" ? <AcceptFollowUpButton followUpId={f.id} /> : <p className="text-13px text-amber-700">Votre dossier doit être validé pour accepter.</p>}
                  <ReasonForm followUpId={f.id} kind="decline" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <ul className="space-y-2.5">
          {others.map((f) => (
            <li key={f.id}>
              <Link href={`/tuteur/familles/${f.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-soft transition hover:shadow-lift">
                <span className="min-w-0 flex-1">
                  <span className="block text-15px font-semibold text-ink">Famille {f.parent.lastName}</span>
                  <span className="block truncate text-13px text-slate-500">
                    {f.children.map((c) => c.child.firstName).join(", ")} · {f.tasks.length} action{f.tasks.length > 1 ? "s" : ""} · depuis le {formatDate(f.startDate)}
                  </span>
                </span>
                <Badge tone={tones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
                <ChevronRight className="size-5 text-slate-400" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
