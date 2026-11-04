import Link from "next/link";
import { BadgeCheck, MapPin, Search, SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatFcfa, fullName } from "@/lib/format";
import { getSettings } from "@/server/services/settings";
import { tutorReliability } from "@/server/queries/follow-ups";
import { EmptyState, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { CatalogSwitch, ScreenTitle, panel } from "@/components/parent/kit";

export const metadata = { title: "Trouver un tuteur" };

export default async function TutorCatalogPage({ searchParams }: { searchParams: Promise<{ zone?: string; enfant?: string }> }) {
  await requireRole("PARENT");
  const { zone, enfant } = await searchParams;
  const [tutors, settings] = await Promise.all([
    db.tutorProfile.findMany({
      where: { status: "VALIDATED", user: { status: "ACTIVE" }, ...(zone ? { zone: { contains: zone.trim(), mode: "insensitive" as const } } : {}) },
      include: {
        user: { select: { firstName: true, lastName: true } },
        documents: { where: { type: "PHOTO" }, select: { id: true } },
        _count: { select: { followUps: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { validatedAt: "asc" },
      take: 60,
    }),
    getSettings(),
  ]);
  const reliability = await tutorReliability(tutors.map((t) => t.id));
  const suffix = enfant ? `?enfant=${encodeURIComponent(enfant)}` : "";

  return (
    <>
      <ScreenTitle eyebrow="Chaque dossier est vérifié par Access" title="Trouver un tuteur" />
      <CatalogSwitch current="tuteurs" query={suffix} />

      <section className="mb-4 rounded-[22px] bg-brand-50 p-4 text-sm text-brand-900">
        <p className="font-semibold">Le suivi au quotidien</p>
        <p className="mt-1 text-brand-800">
          Vous définissez les actions (leçons, devoirs, visites à l&apos;école), le tuteur les fait et vous envoie un retour à chaque fois. Forfait de{" "}
          <strong>{formatFcfa(settings.followUpFirstChild)}</strong> par mois, puis {formatFcfa(settings.followUpExtraChild)} par enfant supplémentaire.
        </p>
      </section>

      <form method="get" className="mb-4">
        {enfant && <input type="hidden" name="enfant" value={enfant} />}
        <label className="flex h-13 items-center gap-2.5 rounded-[18px] bg-white px-4 text-slate-500 shadow-[0_0_0_1px_rgb(15_23_42/0.08)] focus-within:shadow-[0_0_0_2px_var(--color-brand-400)]">
          <Search className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
          <span className="sr-only">Quartier ou ville</span>
          <input name="zone" defaultValue={zone ?? ""} placeholder="Quartier ou commune : Fidjrossè, Parakou…" className="min-w-0 flex-1 bg-transparent text-15px text-ink outline-none placeholder:text-slate-400" />
          <button className="text-sm font-semibold text-brand-700">Chercher</button>
        </label>
      </form>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <p>
          {tutors.length} tuteur{tutors.length > 1 ? "s" : ""} disponible{tutors.length > 1 ? "s" : ""}
        </p>
        {zone && (
          <Link href={`/parent/tuteurs${suffix}`} className="font-semibold text-brand-700 hover:text-brand-800">
            Effacer la recherche
          </Link>
        )}
      </div>

      {tutors.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun tuteur ne correspond">
          Essayez une zone plus large.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tutors.map((t) => {
            const r = reliability.get(t.id);
            return (
              <li key={t.id}>
                <Link href={`/parent/tuteurs/${t.id}${suffix}`} className={cx(panel, "flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lift")}>
                  <span className="flex items-center gap-3">
                    <Avatar documentId={t.documents[0]?.id} name={fullName(t.user)} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-base font-semibold text-ink">
                        <span className="truncate">
                          {t.user.firstName} {t.user.lastName.charAt(0)}.
                        </span>
                        <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Dossier vérifié" />
                      </span>
                      <span className="mt-0.5 block truncate text-13px text-slate-500">{t.occupation ?? "Tuteur Access"}</span>
                    </span>
                    {r?.rate != null && (
                      <span className="shrink-0 text-right">
                        <span className="block text-15px font-bold text-ink">{r.rate} %</span>
                        <span className="block text-xs text-slate-500">à temps</span>
                      </span>
                    )}
                  </span>
                  {t.bio && <span className="mt-3 line-clamp-2 text-13px leading-relaxed text-slate-600">{t.bio}</span>}
                  <span className="mt-3.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                    {t.zone && (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{t.zone.split(",").slice(0, 2).join(", ")}</span>
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      {t._count.followUps > 0 ? `${t._count.followUps} famille${t._count.followUps > 1 ? "s" : ""} suivie${t._count.followUps > 1 ? "s" : ""}` : "Nouveau tuteur"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
