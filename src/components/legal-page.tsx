import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

export const LEGAL_PAGES = [
  { href: "/conditions", label: "Conditions d'utilisation" },
  { href: "/confidentialite", label: "Politique de confidentialité" },
  { href: "/cookies", label: "Cookies et stockage local" },
  { href: "/mentions-legales", label: "Mentions légales" },
] as const;

export type LegalSection = { id: string; title: string; content: ReactNode };

// Information à fournir par l'exploitant avant la mise en production, mise en évidence dans le texte.
export function ToComplete({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-900">[{children}]</mark>;
}

// Page juridique : en-tête, sommaire latéral (replié en haut sur mobile), sections numérotées, liens vers les autres pages juridiques.
export function LegalPage({
  path,
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: {
  path: (typeof LEGAL_PAGES)[number]["href"];
  eyebrow: string;
  title: string;
  intro: ReactNode;
  updatedAt: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-6 sm:pt-20">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.08em] text-brand-600 uppercase">{eyebrow}</p>
        <h1 className="mt-3.5 font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.04] font-bold tracking-[-0.035em] text-ink">{title}</h1>
        <div className="mt-6 text-lg leading-relaxed text-slate-600">{intro}</div>
        <p className="mt-6 text-sm text-slate-500">Dernière mise à jour : {updatedAt}</p>
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          Projet de texte à faire valider par un conseil juridique avant la mise en production. Les éléments surlignés entre crochets sont à compléter par l&apos;exploitant.
        </p>
      </header>

      <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Sommaire" className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-13px font-semibold tracking-wider text-slate-500 uppercase">Sommaire</p>
          <ol className="mt-3 space-y-1 border-l border-slate-200">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-slate-600 transition hover:border-brand-500 hover:text-ink">
                  <span className="mr-1.5 text-slate-400 tabular-nums">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="max-w-3xl space-y-12 text-base leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline-offset-2 hover:[&_a]:underline [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_*+ul]:mt-4 [&_ul+p]:mt-4">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                <span className="mr-2 text-brand-300 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <div className="mt-4">{s.content}</div>
            </section>
          ))}
        </article>
      </div>

      <aside aria-label="Autres documents" className="mt-20 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEGAL_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            aria-current={p.href === path ? "page" : undefined}
            className={cx(
              "rounded-2xl px-5 py-4 text-15px font-semibold transition",
              p.href === path ? "bg-brand-600 text-white" : "bg-canvas text-ink hover:bg-slate-100",
            )}
          >
            {p.label}
          </Link>
        ))}
      </aside>
    </div>
  );
}
