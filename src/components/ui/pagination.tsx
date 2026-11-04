import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageNumbers, type PageInfo } from "@/lib/pagination";
import { cx } from "@/components/ui";

const count = new Intl.NumberFormat("fr-FR");

// Pagination numérotée en liens GET : chaque page a son URL (partageable, bouton retour du navigateur).
// Sur mobile, seules la première, la dernière et la page courante sont numérotées ; les flèches restent à portée de pouce.
export function Pagination({
  info,
  path,
  params = {},
  label = "résultat",
  className,
}: {
  info: PageInfo;
  path: string;
  // Filtres de la page à conserver d'une page à l'autre (recherche, statut, onglet…).
  params?: Record<string, string | undefined>;
  label?: string;
  className?: string;
}) {
  const { page, pages, total, skip, take } = info;
  if (pages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${path}?${s}` : path;
  };
  const from = skip + 1;
  const to = Math.min(total, skip + take);

  const box = "flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium tabular-nums transition";
  const idle = "text-slate-600 hover:bg-slate-100 hover:text-ink";
  const arrow = cx(box, "gap-1.5 border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50");
  const off = cx(box, "gap-1.5 border border-slate-100 bg-white text-slate-300");

  const numbers = (siblings: number, cls: string) => (
    <ul className={cls}>
      {pageNumbers(page, pages, siblings).map((p, i) =>
        p === "…" ? (
          <li key={`gap-${i}`} className="flex h-10 w-6 items-center justify-center text-slate-400" aria-hidden>
            …
          </li>
        ) : (
          <li key={p}>
            <Link
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={cx(box, p === page ? "bg-brand-600 text-white shadow-sm" : idle)}
            >
              {p}
            </Link>
          </li>
        ),
      )}
    </ul>
  );

  return (
    <nav aria-label="Pagination" className={cx("mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}>
      <p className="text-13px text-slate-500">
        <span className="font-medium text-slate-700 tabular-nums">
          {count.format(from)}–{count.format(to)}
        </span>{" "}
        sur <span className="font-medium text-slate-700 tabular-nums">{count.format(total)}</span> {label}
        {total > 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} className={arrow} aria-label="Page précédente" rel="prev">
            <ChevronLeft className="size-4" aria-hidden />
            <span className="hidden lg:inline">Précédent</span>
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            <ChevronLeft className="size-4" aria-hidden />
            <span className="hidden lg:inline">Précédent</span>
          </span>
        )}
        {numbers(0, "flex items-center gap-0.5 sm:hidden")}
        {numbers(1, "hidden items-center gap-0.5 sm:flex")}
        {page < pages ? (
          <Link href={href(page + 1)} className={arrow} aria-label="Page suivante" rel="next">
            <span className="hidden lg:inline">Suivant</span>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={off} aria-disabled="true">
            <span className="hidden lg:inline">Suivant</span>
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
