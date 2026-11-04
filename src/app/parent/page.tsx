import Link from "next/link";
import { CalendarDays, Check, ChevronRight, ClipboardCheck, CreditCard, GraduationCap, ListChecks, UserRoundPlus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { currentWeek, tutoringProgress } from "@/lib/progress";
import { nextSession } from "@/lib/schedule";
import { widthClass } from "@/lib/ui-scale";
import { LinkButton, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { Bar, KidChips, ScreenTitle, SectionHeading, darkPanel, display, panel } from "@/components/parent/kit";

export const metadata = { title: "Accueil" };

const dayMonth = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", day: "numeric", month: "short" });
const today = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Porto-Novo", weekday: "long", day: "numeric", month: "long" });

export default async function ParentHome({ searchParams }: { searchParams: Promise<{ enfant?: string }> }) {
  const user = await requireRole("PARENT");
  const kids = await db.child.findMany({ where: { parentId: user.id }, orderBy: { firstName: "asc" } });
  const greeting = today.format(new Date());

  if (kids.length === 0) {
    return (
      <>
        <ScreenTitle eyebrow={greeting.charAt(0).toUpperCase() + greeting.slice(1)} title={`Bonjour ${user.firstName}`} />
        <p className="-mt-2 mb-6 text-15px text-slate-500">Trois étapes pour trouver le bon éducateur pour votre enfant.</p>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: UserRoundPlus, title: "Inscrivez votre enfant", text: "Classe, école et niveau par matière.", href: "/parent/enfants/nouveau", cta: "Inscrire mon enfant" },
            { icon: GraduationCap, title: "Choisissez un éducateur", text: "Par matière, jour et quartier.", href: "/parent/educateurs", cta: "Voir les éducateurs" },
            { icon: ClipboardCheck, title: "Suivez les séances", text: "Confirmez chaque compte rendu." },
          ].map((s, i) => (
            <li key={s.title} className={cx(i === 0 ? darkPanel : panel, "p-6")}>
              <span className={cx(display, "text-5xl leading-none font-extrabold", i === 0 ? "text-white/20" : "text-brand-100")} aria-hidden>
                0{i + 1}
              </span>
              <p className={cx(display, "mt-5 text-xl font-bold", i === 0 ? "text-white" : "text-ink")}>{s.title}</p>
              <p className={cx("mt-1 text-sm", i === 0 ? "text-brand-200" : "text-slate-500")}>{s.text}</p>
              {s.href && (
                <LinkButton href={s.href} variant={i === 0 ? "secondary" : "primary"} className="mt-5">
                  {s.cta}
                </LinkButton>
              )}
            </li>
          ))}
        </ol>
      </>
    );
  }

  const { enfant } = await searchParams;
  const kid = kids.find((k) => k.id === enfant);
  const scope = { parentId: user.id, ...(kid && { childId: kid.id }) };

  const [tutorings, toConfirm, toConfirmCount, nextInstallment] = await Promise.all([
    db.tutoring.findMany({
      where: { ...scope, status: "ACTIVE" },
      include: {
        child: true,
        bookedSlots: { select: { day: true, slot: true } },
        educator: { include: { user: { select: { firstName: true, lastName: true } }, documents: { where: { type: "PHOTO" }, select: { id: true } } } },
      },
      orderBy: { startDate: "asc" },
    }),
    db.lesson.findFirst({
      where: { status: "RECORDED", tutoring: scope },
      include: { tutoring: { include: { child: { select: { firstName: true } } } } },
      orderBy: [{ date: "asc" }, { slot: "asc" }],
    }),
    db.lesson.count({ where: { status: "RECORDED", tutoring: scope } }),
    db.installment.findFirst({
      where: { status: "PENDING", tutoring: scope },
      include: { tutoring: { include: { child: { select: { firstName: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Suivi au quotidien : suivis ouverts et retours du tuteur pas encore vus.
  const followScope = { parentId: user.id, status: { in: ["ACTIVE" as const, "REQUESTED" as const] }, ...(kid && { children: { some: { childId: kid.id } } }) };
  const [followUps, unseenReports] = await Promise.all([
    db.followUp.findMany({ where: followScope, include: { tutor: { include: { user: { select: { firstName: true, lastName: true } } } }, children: { include: { child: { select: { firstName: true } } } } }, orderBy: { createdAt: "asc" } }),
    db.taskOccurrence.findMany({ where: { reportedAt: { not: null }, parentSeenAt: null, task: { followUp: { parentId: user.id } }, ...(kid && { childId: kid.id }) }, select: { task: { select: { followUpId: true } } } }),
  ]);

  const now = new Date();
  const upcoming = tutorings
    .map((t) => ({ t, next: nextSession(t.bookedSlots, { start: t.startDate, end: t.endDate }, now) }))
    .filter((x) => x.next)
    .sort((a, b) => a.next!.start.getTime() - b.next!.start.getTime())[0];
  const overdue = nextInstallment && nextInstallment.dueDate < now;

  return (
    <>
      <ScreenTitle eyebrow={greeting.charAt(0).toUpperCase() + greeting.slice(1)} title={`Bonjour ${user.firstName}`} />
      {kids.length > 1 && <KidChips kids={kids} current={kid?.id} all="Tous" hrefFor={(id) => (id ? `/parent?enfant=${id}` : "/parent")} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div className="space-y-4">
          {toConfirm && (
            <Link href={`/parent/tutorats/${toConfirm.tutoringId}#seance-${toConfirm.id}`} className={cx(darkPanel, "block p-5 transition hover:bg-brand-700")}>
              <span className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-accent-500 px-3 py-1 text-xs font-bold whitespace-nowrap">
                  {toConfirmCount > 1 ? `${toConfirmCount} séances à confirmer` : "À confirmer"}
                </span>
                <span className="text-right text-13px whitespace-nowrap text-brand-200">
                  {dayMonth.format(toConfirm.date)} · {TIME_SLOTS[toConfirm.slot].slice(0, 3)}
                </span>
              </span>
              <span className={cx(display, "mt-3.5 block text-[22px] leading-tight font-bold")}>
                La séance de {toConfirm.tutoring.child.firstName} a-t-elle bien eu lieu ?
              </span>
              <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-brand-100">{toConfirm.workDone}</span>
              <span className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-15px font-bold text-brand-600">
                <Check className="size-[18px]" strokeWidth={2.2} aria-hidden /> Lire et confirmer
              </span>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-3">
            {upcoming ? (
              <Link href={`/parent/tutorats/${upcoming.t.id}`} className={cx(panel, "flex flex-col justify-between gap-5 p-4 transition hover:shadow-lift")}>
                <span className="flex size-10 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600" aria-hidden>
                  <CalendarDays className="size-5" strokeWidth={1.9} />
                </span>
                <span>
                  <span className="block text-xs text-slate-500">Prochaine séance</span>
                  <span className={cx(display, "mt-0.5 block text-lg leading-tight font-bold text-ink")}>
                    {upcoming.next!.when}, {upcoming.next!.hours.slice(0, 3)}
                  </span>
                  <span className="mt-0.5 block truncate text-13px text-slate-600">
                    {upcoming.t.child.firstName} · {upcoming.t.educator.user.firstName} {upcoming.t.educator.user.lastName.charAt(0)}.
                  </span>
                </span>
              </Link>
            ) : (
              <Link href="/parent/educateurs" className={cx(panel, "flex flex-col justify-between gap-5 p-4 transition hover:shadow-lift")}>
                <span className="flex size-10 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600" aria-hidden>
                  <CalendarDays className="size-5" strokeWidth={1.9} />
                </span>
                <span>
                  <span className="block text-xs text-slate-500">Prochaine séance</span>
                  <span className={cx(display, "mt-0.5 block text-lg font-bold text-ink")}>Aucune prévue</span>
                  <span className="mt-0.5 block text-13px font-semibold text-brand-700">Trouver un éducateur</span>
                </span>
              </Link>
            )}
            <Link
              href="/parent/paiements"
              className={cx("flex flex-col justify-between gap-5 rounded-[24px] p-4 transition", overdue ? "bg-rose-50 hover:bg-rose-100" : "bg-accent-50 hover:bg-accent-100")}
            >
              <span className={cx("flex size-10 items-center justify-center rounded-[14px] bg-white", overdue ? "text-rose-600" : "text-accent-600")} aria-hidden>
                <CreditCard className="size-5" strokeWidth={1.9} />
              </span>
              {nextInstallment ? (
                <span>
                  <span className={cx("block text-xs", overdue ? "text-rose-700" : "text-accent-800")}>
                    {overdue ? "En retard depuis le" : "À payer avant le"} {formatDate(nextInstallment.dueDate)}
                  </span>
                  <span className={cx(display, "mt-0.5 block text-lg font-bold text-ink")}>{formatFcfa(nextInstallment.amount)}</span>
                  <span className={cx("mt-0.5 block text-13px font-semibold", overdue ? "text-rose-700" : "text-accent-700")}>Payer maintenant</span>
                </span>
              ) : (
                <span>
                  <span className="block text-xs text-accent-800">Échéances</span>
                  <span className={cx(display, "mt-0.5 block text-lg font-bold text-ink")}>Tout est réglé</span>
                  <span className="mt-0.5 block text-13px font-semibold text-accent-700">Historique</span>
                </span>
              )}
            </Link>
          </div>
        </div>

        <section aria-labelledby="t-encours">
          <SectionHeading id="t-encours" action={<Link href="/parent/tutorats" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Tout voir</Link>}>
            En cours
          </SectionHeading>
          {tutorings.length === 0 ? (
            <div className={cx(panel, "p-5 text-sm text-slate-500")}>
              Aucun accompagnement en cours.{" "}
              <Link href={kid ? `/parent/educateurs?classe=${encodeURIComponent(kid.currentClass)}&enfant=${kid.id}` : "/parent/educateurs"} className="font-semibold text-brand-700">
                Trouver un éducateur
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {tutorings.map((t) => (
                <li key={t.id}>
                  <Link href={`/parent/tutorats/${t.id}`} className={cx(panel, "flex items-center gap-3 px-3.5 py-3 transition hover:shadow-lift")}>
                    <Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-15px font-semibold text-ink">
                        {t.child.firstName} · {t.educator.user.firstName} {t.educator.user.lastName.charAt(0)}.
                      </span>
                      <span className="mt-0.5 block truncate text-13px text-slate-500">
                        Semaine {currentWeek(t.startDate, t.durationWeeks, now)} sur {t.durationWeeks} · {t.slotsLabel}
                      </span>
                      <span className="mt-2 block">
                        <Bar widthClass={widthClass(tutoringProgress(t.startDate, t.endDate, now))} />
                      </span>
                    </span>
                    <ChevronRight className="size-5 text-slate-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="t-suivi">
          <SectionHeading id="t-suivi" action={followUps.length > 0 && <Link href="/parent/suivi" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Tout voir</Link>}>
            Suivi au quotidien
          </SectionHeading>
          {followUps.length === 0 ? (
            <Link href={kid ? `/parent/tuteurs?enfant=${kid.id}` : "/parent/tuteurs"} className={cx(panel, "flex items-center gap-3 p-4 transition hover:shadow-lift")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-accent-50 text-accent-700" aria-hidden>
                <ListChecks className="size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-15px font-semibold text-ink">Un tuteur pour les leçons et les devoirs</span>
                <span className="mt-0.5 block text-13px text-slate-500">Vous fixez les actions, il les fait et vous fait un retour.</span>
                <span className="mt-1 block text-13px font-semibold text-brand-700">Trouver un tuteur</span>
              </span>
            </Link>
          ) : (
            <ul className="space-y-2.5">
              {followUps.map((f) => (
                <li key={f.id}>
                  <Link href={`/parent/suivi/${f.id}`} className={cx(panel, "flex items-center gap-3 px-3.5 py-3 transition hover:shadow-lift")}>
                    <Avatar name={fullName(f.tutor.user)} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-15px font-semibold text-ink">
                        {f.children.map((c) => c.child.firstName).join(", ")} · {f.tutor.user.firstName} {f.tutor.user.lastName.charAt(0)}.
                      </span>
                      <span className="mt-0.5 block truncate text-13px text-slate-500">{f.status === "REQUESTED" ? "En attente de la réponse du tuteur" : unseenLabel(unseenReports.filter((o) => o.task.followUpId === f.id).length)}</span>
                    </span>
                    <ChevronRight className="size-5 text-slate-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function unseenLabel(n: number) {
  return n > 0 ? `${n} retour${n > 1 ? "s" : ""} à lire` : "Tout est lu";
}
