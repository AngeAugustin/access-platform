import { buttonClass } from "@/components/ui";

// Barre de recherche/filtre en GET : l'URL reste partageable.
export function SearchBar({ q, placeholder, children }: { q?: string; placeholder: string; children?: React.ReactNode }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap gap-2">
      <input name="q" defaultValue={q ?? ""} placeholder={placeholder} className="field max-w-xs" aria-label="Recherche" />
      {children}
      <button className={buttonClass("secondary")}>Rechercher</button>
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
