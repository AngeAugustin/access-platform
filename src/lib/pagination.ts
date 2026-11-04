// Pagination des listes : numéro de page lu dans l'URL (?page=), découpage côté base et numéros à afficher.

export const PAGE_SIZE = 20;

export type PageInfo = { page: number; pages: number; total: number; size: number; skip: number; take: number };

export function paginate(total: number, rawPage: string | undefined, size = PAGE_SIZE): PageInfo {
  const pages = Math.max(1, Math.ceil(total / size));
  const asked = Number.parseInt(rawPage ?? "1", 10);
  // Une page hors limites (lien ancien, saisie à la main) affiche la plus proche plutôt qu'une liste vide.
  const page = Math.min(pages, Math.max(1, Number.isFinite(asked) ? asked : 1));
  return { page, pages, total, size, skip: (page - 1) * size, take: size };
}

// Pour une liste déjà chargée en mémoire (totaux calculés sur l'ensemble, listes fusionnées…).
export function pageSlice<T>(items: T[], rawPage: string | undefined, size = PAGE_SIZE): { items: T[]; info: PageInfo } {
  const info = paginate(items.length, rawPage, size);
  return { items: items.slice(info.skip, info.skip + info.take), info };
}

// Numéros à afficher : la première, la dernière et `siblings` pages de part et d'autre de la page courante,
// avec « … » pour les trous. Un trou d'une seule page est remplacé par son numéro (pas de « … » pour rien).
export function pageNumbers(page: number, pages: number, siblings = 1): (number | "…")[] {
  // Peu de pages : toutes tiennent dans la place que prendrait la version abrégée.
  if (pages <= 2 * siblings + 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const wanted = new Set([1, pages]);
  for (let p = page - siblings; p <= page + siblings; p++) if (p >= 1 && p <= pages) wanted.add(p);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const p of sorted) {
    const prev = out.at(-1);
    if (typeof prev === "number" && p - prev === 2) out.push(prev + 1);
    else if (typeof prev === "number" && p - prev > 2) out.push("…");
    out.push(p);
  }
  return out;
}
