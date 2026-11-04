import Link from "next/link";
import { BadgeCheck, MapPin, Search, SearchX, SlidersHorizontal, Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { WEEKDAYS } from "@/lib/constants";
import { activeSubjects, cycleOfClass, subjectLabel } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";
import { fullName } from "@/lib/format";
import { listCatalog } from "@/server/queries/educators";
import { EmptyState, buttonClass, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { CatalogSwitch, ScreenTitle, panel } from "@/components/parent/kit";
import { CycleClassSelect } from "@/components/parent/cycle-class-select";

export const metadata = { title: "Trouver un éducateur" };

type Search = { cycle?: string; classe?: string; matiere?: string; zone?: string; jour?: string; enfant?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const parent = await requireRole("PARENT");
  const filters = await searchParams;
  const [educators, curriculum, kid] = await Promise.all([
    listCatalog(filters),
    getCurriculum(),
    filters.enfant ? db.child.findFirst({ where: { id: filters.enfant, parentId: parent.id }, select: { firstName: true, currentClass: true } }) : null,
  ]);
  const suffix = filters.enfant ? `?enfant=${encodeURIComponent(filters.enfant)}` : "";
  const active = [filters.cycle, filters.classe, filters.matiere, filters.jour, filters.zone].filter(Boolean).length;
  const panelFilters = [filters.cycle, filters.classe, filters.matiere, filters.jour].filter(Boolean).length;
  const cycle = filters.cycle || (filters.classe ? cycleOfClass(curriculum, filters.classe) : undefined);
  const classes = curriculum.classes.filter((c) => c.active).map((c) => ({ name: c.name, cycle: c.cycle, subjects: c.subjects }));

  return (
    <>
      <ScreenTitle eyebrow={kid ? `Pour ${kid.firstName} · ${kid.currentClass}` : "Chaque dossier est vérifié par Access"} title="Trouver un éducateur" />
      <CatalogSwitch current="educateurs" query={suffix} />

      <form method="get" className="mb-4 space-y-3">
        {filters.enfant && <input type="hidden" name="enfant" value={filters.enfant} />}
        <label className="flex h-13 items-center gap-2.5 rounded-[18px] bg-white px-4 text-slate-500 shadow-[0_0_0_1px_rgb(15_23_42/0.08)] focus-within:shadow-[0_0_0_2px_var(--color-brand-400)]">
          <Search className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
          <span className="sr-only">Quartier ou ville</span>
          <input name="zone" defaultValue={filters.zone ?? ""} placeholder="Quartier ou commune : Fidjrossè, Parakou…" className="min-w-0 flex-1 bg-transparent text-15px text-ink outline-none placeholder:text-slate-400" />
          <button className="text-sm font-semibold text-brand-700">Chercher</button>
        </label>
        <details className="group" open={panelFilters > 0 || undefined}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" aria-hidden /> Filtres
            {panelFilters > 0 && <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{panelFilters}</span>}
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <CycleClassSelect classes={classes} subjects={activeSubjects(curriculum)} defaultCycle={cycle} defaultClass={filters.classe} defaultSubject={filters.matiere} />
            <select name="jour" defaultValue={filters.jour ?? ""} className="field" aria-label="Jour disponible">
              <option value="">Tous les jours</option>
              {Object.entries(WEEKDAYS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button className={buttonClass("dark", "h-11 sm:col-span-2 lg:col-span-1")}>Appliquer</button>
          </div>
        </details>
      </form>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <p>
          {educators.length} éducateur{educators.length > 1 ? "s" : ""} disponible{educators.length > 1 ? "s" : ""}
        </p>
        {active > 0 && (
          <Link href={`/parent/educateurs${suffix}`} className="font-semibold text-brand-700 hover:text-brand-800">
            Effacer les filtres
          </Link>
        )}
      </div>

      {educators.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun éducateur ne correspond">
          Essayez une autre matière, un autre jour ou une zone plus large.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {educators.map((e) => {
            const rating = e.avgRating ?? e.stars;
            return (
              <li key={e.id}>
                <Link href={`/parent/educateurs/${e.id}${suffix}`} className={cx(panel, "flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lift")}>
                  <span className="flex items-center gap-3">
                    <Avatar documentId={e.documents[0]?.id} name={fullName(e.user)} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-base font-semibold text-ink">
                        <span className="truncate">
                          {e.user.firstName} {e.user.lastName.charAt(0)}.
                        </span>
                        <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Dossier vérifié" />
                      </span>
                      <span className="mt-0.5 block truncate text-13px text-slate-500">{e.subjects.map((s) => subjectLabel(curriculum, s)).join(", ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      {rating ? (
                        <span className="flex items-center gap-1 text-15px font-bold text-ink">
                          <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                          {rating.toFixed(1).replace(".", ",")}
                        </span>
                      ) : null}
                      <span className="block text-xs text-slate-500">{e.reviewCount > 0 ? `${e.reviewCount} avis` : "Note Access"}</span>
                    </span>
                  </span>
                  <span className="mt-3.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                    {e.zone && (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{e.zone.split(",")[0]}</span>
                      </span>
                    )}
                    {e.classLevels.length > 0 && (
                      <span className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{e.classLevels.join(", ")}</span>
                    )}
                    {e.cycles.map((c) => (
                      <span key={c} className="rounded-full bg-accent-50 px-2.5 py-1 text-accent-700">
                        {c}
                      </span>
                    ))}
                    <span className={cx("rounded-full px-2.5 py-1", e.freeSlots > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {e.freeSlots > 0 ? `${e.freeSlots} créneau${e.freeSlots > 1 ? "x" : ""} libre${e.freeSlots > 1 ? "s" : ""}` : "Complet"}
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
