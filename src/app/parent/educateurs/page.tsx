import Link from "next/link";
import { BadgeCheck, Briefcase, CalendarCheck, MapPin, SearchX, SlidersHorizontal } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { CLASS_LEVELS, SUBJECTS, WEEKDAYS, type SubjectKey } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { listCatalog } from "@/server/queries/educators";
import { EmptyState, PageHeader, Stars, Tag, buttonClass } from "@/components/ui";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Trouver un éducateur" };

type Search = { classe?: string; matiere?: string; zone?: string; jour?: string; enfant?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("PARENT");
  const filters = await searchParams;
  const educators = await listCatalog(filters);
  const suffix = filters.enfant ? `?enfant=${encodeURIComponent(filters.enfant)}` : "";
  const active = [filters.classe, filters.matiere, filters.jour, filters.zone].filter(Boolean).length;

  return (
    <>
      <PageHeader title="Trouver un éducateur" subtitle="Chaque éducateur présenté ici a un dossier vérifié par Access." />
      <form className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft sm:p-4" method="get">
        {filters.enfant && <input type="hidden" name="enfant" value={filters.enfant} />}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <select name="classe" defaultValue={filters.classe ?? ""} className="field" aria-label="Classe">
            <option value="">Toutes les classes</option>
            {CLASS_LEVELS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="matiere" defaultValue={filters.matiere ?? ""} className="field" aria-label="Matière">
            <option value="">Toutes les matières</option>
            {Object.entries(SUBJECTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="jour" defaultValue={filters.jour ?? ""} className="field" aria-label="Jour disponible">
            <option value="">Tous les jours</option>
            {Object.entries(WEEKDAYS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input name="zone" defaultValue={filters.zone ?? ""} placeholder="Ville ou quartier" className="field" aria-label="Zone" />
          <button className={buttonClass("primary", "h-11")}>
            <SlidersHorizontal aria-hidden /> Filtrer
          </button>
        </div>
      </form>
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <p>
          {educators.length} éducateur{educators.length > 1 ? "s" : ""}
          {active > 0 && " correspondant à vos critères"}
        </p>
        {active > 0 && (
          <Link href={`/parent/educateurs${suffix}`} className="font-medium text-brand-700 hover:text-brand-800">
            Effacer les filtres
          </Link>
        )}
      </div>

      {educators.length === 0 ? (
        <EmptyState icon={SearchX} title="Aucun éducateur ne correspond">
          Essayez un autre jour ou une zone plus large.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {educators.map((e) => (
            <li key={e.id}>
              <Link
                href={`/parent/educateurs/${e.id}${suffix}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift"
              >
                <div className="flex items-start gap-3.5">
                  <Avatar documentId={e.documents[0]?.id} name={fullName(e.user)} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                      {fullName(e.user)}
                      <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Vérifié" />
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Stars value={e.avgRating ?? e.stars} />
                      <span className="text-xs text-slate-500">{e.reviewCount > 0 ? `${e.reviewCount} avis` : e.level}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {e.subjects.slice(0, 3).map((s) => (
                    <Tag key={s}>{SUBJECTS[s as SubjectKey] ?? s}</Tag>
                  ))}
                  {e.subjects.length > 3 && <Tag>+{e.subjects.length - 3}</Tag>}
                </div>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <div className="flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{e.zone?.split(",")[0] ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="size-3.5 shrink-0" aria-hidden />
                    {e.experienceYears ?? 0} an{(e.experienceYears ?? 0) > 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1 font-medium text-emerald-700">
                    <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
                    {e.freeSlots} libre{e.freeSlots > 1 ? "s" : ""}
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
