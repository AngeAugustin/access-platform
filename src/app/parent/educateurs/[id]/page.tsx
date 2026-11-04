import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, ChevronLeft, ShieldCheck, Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { subjectLabel } from "@/lib/curriculum";
import { amountForWeeks } from "@/lib/billing";
import { getCurriculum } from "@/server/queries/curriculum";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { getSettings } from "@/server/services/settings";
import { Card, Stars, cx } from "@/components/ui";
import { darkPanel, display, panel, roundIcon } from "@/components/parent/kit";
import { dots } from "@/components/marketing";
import { Avatar } from "@/components/avatar";
import { AvailabilityGrid, AvailabilityLegend } from "@/components/availability-grid";
import { TutoringRequestForm } from "@/components/parent/tutoring-form";
import { BackgroundSummary } from "@/components/educator/background-summary";

export const metadata = { title: "Profil éducateur" };

export default async function EducatorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enfant?: string }> }) {
  const parent = await requireRole("PARENT");
  const { id } = await params;
  const { enfant } = await searchParams;
  const educator = await db.educatorProfile.findFirst({
    where: { id, status: "VALIDATED", user: { status: "ACTIVE" } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      documents: { where: { type: "PHOTO" }, select: { id: true } },
      availabilities: true,
      bookedSlots: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 10, include: { parent: { select: { firstName: true } } } },
    },
  });
  if (!educator) notFound();

  const [children, tariffs, settings, curriculum, ratings, lessonCount] = await Promise.all([
    db.child.findMany({ where: { parentId: parent.id }, orderBy: { firstName: "asc" } }),
    db.tariff.findMany(),
    getSettings(),
    getCurriculum(),
    db.review.groupBy({ by: ["rating"], where: { educatorId: educator.id }, _count: true }),
    db.lesson.count({ where: { status: "CONFIRMED", tutoring: { educatorId: educator.id } } }),
  ]);

  const name = fullName(educator.user);
  const reviewCount = ratings.reduce((n, r) => n + r._count, 0);
  const avg = reviewCount ? ratings.reduce((s, r) => s + r.rating * r._count, 0) / reviewCount : null;
  const freeSlots = educator.availabilities
    .filter((a) => !educator.bookedSlots.some((b) => b.day === a.day && b.slot === a.slot))
    .map((a) => ({ day: a.day, slot: a.slot }));
  const subjects = educator.subjects.map((s) => subjectLabel(curriculum, s));
  // Prix d'appel : l'échéance la moins chère parmi les classes où intervient l'éducateur.
  const prices = tariffs.filter((t) => educator.classLevels.includes(t.classLevel)).map((t) => amountForWeeks(t, settings.weeksPerInstallment));
  const fromPrice = prices.length ? Math.min(...prices) : null;

  return (
    <>
      <div className={cx(darkPanel, dots, "relative -mx-4 -mt-4 rounded-t-none px-4 pt-4 pb-16 sm:mx-0 sm:mt-0 sm:rounded-t-[28px] sm:px-6")}>
        <div className="flex items-center justify-between">
          <Link href={`/parent/educateurs${enfant ? `?enfant=${enfant}` : ""}`} className={cx(roundIcon, "bg-white/10 hover:bg-white/20")} aria-label="Retour aux éducateurs">
            <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
          </Link>
          {educator.cycles.map((c) => (
            <span key={c} className="rounded-full bg-accent-500 px-3 py-1 text-xs font-bold">
              {c}
            </span>
          ))}
        </div>
      </div>
      <div className="relative -mt-12 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <section className={cx(panel, "p-5 shadow-[0_20px_40px_-24px_rgb(0_74_173/0.35)] sm:p-6")}>
            <div className="flex items-center gap-4">
              <Avatar documentId={educator.documents[0]?.id} name={name} size={72} />
              <div className="min-w-0">
                <h1 className={cx(display, "text-[26px] leading-tight font-bold text-ink")}>{name}</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {educator.zone ? educator.zone.split(",")[0] : "Zone non précisée"} · {educator.experienceYears ?? 0} an{(educator.experienceYears ?? 0) > 1 ? "s" : ""} d&apos;expérience
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">{reviewCount ? `${reviewCount} avis` : "note Access"}</dt>
                <dd className={cx(display, "flex items-center justify-center gap-1 text-xl font-bold text-ink")}>
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  {(avg ?? educator.stars ?? 0).toFixed(1).replace(".", ",")}
                </dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">séances</dt>
                <dd className={cx(display, "text-xl font-bold text-ink")}>{lessonCount}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">créneaux libres</dt>
                <dd className={cx(display, "text-xl font-bold", freeSlots.length ? "text-emerald-700" : "text-slate-400")}>{freeSlots.length}</dd>
              </div>
            </dl>
            {educator.bio && <p className="mt-5 border-t border-slate-100 pt-4 text-15px leading-relaxed whitespace-pre-line text-slate-600">{educator.bio}</p>}
          </section>

          <section className="rounded-[22px] bg-emerald-50 p-4">
            <p className="flex items-center gap-1.5 text-13px font-bold text-emerald-800">
              <BadgeCheck className="size-4" aria-hidden /> Dossier vérifié par Access
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-13px text-emerald-900">
              {["Identité", "Casier judiciaire", "Diplômes", "Deux garants"].map((c) => (
                <li key={c} className="flex items-center gap-1">
                  <Check className="size-3.5" strokeWidth={2.4} aria-hidden /> {c}
                </li>
              ))}
            </ul>
          </section>

          <Card title="Ce qu'il enseigne">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Chips title="Matières" items={subjects} tone="brand" />
              <Chips title="Classes" items={educator.classLevels} />
            </div>
            {(educator.degreeLevel || educator.background) && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="mb-3 text-15px font-semibold text-ink">Parcours</h3>
                <BackgroundSummary e={educator} />
              </div>
            )}
          </Card>

          <Card title="Disponibilités" description="Choisissez vos créneaux dans la demande de tutorat." action={<AvailabilityLegend />}>
            <AvailabilityGrid availabilities={educator.availabilities} booked={educator.bookedSlots} />
          </Card>

          <Card title="Avis des familles">
            {reviewCount === 0 ? (
              <p className="text-sm text-slate-500">Pas encore d&apos;avis : la note affichée est celle attribuée par Access après vérification du dossier.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-[160px_1fr] sm:items-center">
                  <div className="text-center sm:text-left">
                    <p className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{avg!.toFixed(1).replace(".", ",")}</p>
                    <div className="mt-1.5">
                      <Stars value={avg} size="md" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {reviewCount} avis de famille{reviewCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratings.find((r) => r.rating === stars)?._count ?? 0;
                      return (
                        <li key={stars} className="flex items-center gap-2">
                          <span className="w-3 text-slate-500">{stars}</span>
                          <progress
                            value={count}
                            max={reviewCount}
                            aria-label={`${count} avis à ${stars} étoile${stars > 1 ? "s" : ""}`}
                            className="h-2 flex-1 appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-amber-400 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber-400"
                          />
                          <span className="w-5 text-right text-slate-400 tabular-nums">{count}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <ul className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
                  {educator.reviews.map((r) => (
                    <li key={r.id} className="flex gap-3 py-4 last:pb-0">
                      <Avatar name={r.parent.firstName} size={36} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink">{r.parent.firstName}</span>
                          <Stars value={r.rating} />
                          <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                        </div>
                        {r.comment && <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <aside id="demande" className="min-w-0 scroll-mt-24 lg:sticky lg:top-24">
          <section className="rounded-2xl border border-slate-200/80 bg-white shadow-soft">
            <header className="border-b border-slate-100 p-5 sm:px-6">
              <h2 className="text-15px font-semibold tracking-tight text-ink">Demander un tutorat</h2>
              {fromPrice !== null ? (
                <p className="mt-2 text-sm text-slate-500">
                  À partir de <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{formatFcfa(fromPrice)}</span> / {settings.weeksPerInstallment} semaines
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-400">Le tarif dépend de la classe de l&apos;enfant.</p>
            </header>
            <div className="p-5 sm:px-6">
              <TutoringRequestForm
                educatorId={educator.id}
                educatorClasses={educator.classLevels}
                kids={children.map((c) => ({ id: c.id, name: fullName(c), classLevel: c.currentClass }))}
                defaultChildId={enfant}
                freeSlots={freeSlots}
                tariffs={tariffs.map((t) => ({ classLevel: t.classLevel, hourlyRate: t.hourlyRate, sessionsPerWeek: t.sessionsPerWeek, hoursPerSession: t.hoursPerSession }))}
                maxWeeks={settings.maxDurationWeeks}
                weeksPerInstallment={settings.weeksPerInstallment}
              />
            </div>
          </section>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="size-3.5" aria-hidden /> Éducateur vérifié par Access : identité, casier et diplômes.
          </p>
        </aside>
      </div>

      {/* Appel à l’action toujours visible sur mobile, au-dessus de la barre d’onglets. */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-md items-center gap-3 rounded-[22px] bg-white p-2.5 pl-4 shadow-[0_12px_32px_-12px_rgb(0_74_173/0.35),0_0_0_1px_rgb(15_23_42/0.06)] lg:hidden">
        {fromPrice !== null && (
          <span className="shrink-0">
            <span className="block text-11px text-slate-500">À partir de</span>
            <span className={cx(display, "block text-lg leading-tight font-bold text-ink")}>{formatFcfa(fromPrice)}</span>
          </span>
        )}
        <a href="#demande" className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent-500 text-15px font-bold text-white transition hover:bg-accent-600">
          Demander un tutorat
        </a>
      </div>
    </>
  );
}

function Chips({ title, items, tone = "slate" }: { title: string; items: string[]; tone?: "brand" | "slate" }) {
  return (
    <div>
      <h3 className="text-13px font-medium text-slate-500">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={cx("rounded-lg px-2.5 py-1 text-13px font-medium", tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700")}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
