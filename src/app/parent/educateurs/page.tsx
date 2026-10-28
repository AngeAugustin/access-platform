import Link from "next/link";
import { requireRole } from "@/lib/auth/dal";
import { CLASS_LEVELS, SUBJECTS, WEEKDAYS, type SubjectKey } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { listCatalog } from "@/server/queries/educators";
import { Badge, EmptyState, PageHeader, Stars, buttonClass } from "@/components/ui";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Trouver un éducateur" };

type Search = { classe?: string; matiere?: string; zone?: string; jour?: string; enfant?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("PARENT");
  const filters = await searchParams;
  const educators = await listCatalog(filters);
  const suffix = filters.enfant ? `?enfant=${encodeURIComponent(filters.enfant)}` : "";

  return (
    <>
      <PageHeader title="Trouver un éducateur" subtitle="Tous les éducateurs affichés ont un dossier vérifié par Access." />
      <form className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        {filters.enfant && <input type="hidden" name="enfant" value={filters.enfant} />}
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
        <button className={buttonClass("primary")}>Filtrer</button>
      </form>

      {educators.length === 0 ? (
        <EmptyState title="Aucun éducateur ne correspond à ces critères.">Élargissez la recherche (autre jour, autre zone).</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {educators.map((e) => (
            <li key={e.id}>
              <Link href={`/parent/educateurs/${e.id}${suffix}`} className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
                <div className="flex items-center gap-3">
                  <Avatar documentId={e.documents[0]?.id} name={fullName(e.user)} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{fullName(e.user)}</p>
                    <p className="text-xs text-slate-500">
                      {e.zone ?? "Zone non précisée"} · {e.experienceYears ?? 0} an(s) d&apos;expérience
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.subjects.slice(0, 4).map((s) => (
                    <Badge key={s} tone="blue">
                      {SUBJECTS[s as SubjectKey] ?? s}
                    </Badge>
                  ))}
                  {e.subjects.length > 4 && <Badge>+{e.subjects.length - 4}</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between pt-3 text-sm">
                  <span>
                    <Stars value={e.avgRating ?? e.stars} />
                    {e.reviewCount > 0 && <span className="ml-1 text-xs text-slate-500">({e.reviewCount} avis)</span>}
                  </span>
                  <span className="text-xs text-slate-600">{e.freeSlots} créneau(x) libre(s)</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
