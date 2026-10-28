import { Search } from "lucide-react";
import { buttonClass } from "@/components/ui";

// Barre de recherche/filtre en GET : l'URL reste partageable.
export function SearchBar({ q, placeholder, children }: { q?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form method="get" className="mb-5 flex flex-wrap gap-2.5">
      <div className="relative min-w-60 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input name="q" defaultValue={q ?? ""} placeholder={placeholder} className="field pl-10" aria-label="Recherche" />
      </div>
      {children}
      <button className={buttonClass("secondary", "h-11")}>Rechercher</button>
    </form>
  );
}

export function userSearch(q?: string) {
  if (!q) return {};
  const term = q.trim().slice(0, 80);
  return {
    OR: [
      { firstName: { contains: term, mode: "insensitive" as const } },
      { lastName: { contains: term, mode: "insensitive" as const } },
      { email: { contains: term, mode: "insensitive" as const } },
      { phone: { contains: term } },
      { npi: { contains: term } },
    ],
  };
}
