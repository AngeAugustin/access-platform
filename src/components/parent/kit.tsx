import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";

// Briques visuelles de l'espace parent : titres en police d'affichage, cartes arrondies, fond sombre pour l'essentiel.

export const panel = "rounded-[24px] bg-white shadow-[0_0_0_1px_rgb(15_23_42/0.06)]";
export const darkPanel = "rounded-[28px] bg-brand-600 text-white";
export const display = "font-display tracking-[-0.03em]";
export const roundIcon = "flex size-11 shrink-0 items-center justify-center rounded-[15px] transition";

export function ScreenTitle({ title, eyebrow, back, action }: { title: ReactNode; eyebrow?: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back} className={cx(roundIcon, "mb-4 bg-white text-ink shadow-[0_0_0_1px_rgb(15_23_42/0.07)] hover:bg-slate-50")} aria-label="Retour">
            <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
          </Link>
        )}
        {eyebrow && <p className="text-sm text-slate-500">{eyebrow}</p>}
        <h1 className={cx(display, "mt-0.5 text-[30px] leading-[1.1] font-bold text-ink sm:text-[34px]")}>{title}</h1>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionHeading({ id, children, action }: { id?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className={cx(display, "text-xl font-bold text-ink")}>
        {children}
      </h2>
      {action}
    </div>
  );
}

// Anneau d'avancement : la longueur du trait est un attribut SVG, pas un style (CSP).
export function ProgressRing({ percent, className }: { percent: number; className?: string }) {
  const circumference = 2 * Math.PI * 15;
  const filled = (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <svg viewBox="0 0 36 36" className={cx("size-15 shrink-0 -rotate-90", className)} aria-hidden>
      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="4" />
      <circle cx="18" cy="18" r="15" fill="none" className="stroke-accent-500" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} />
    </svg>
  );
}

export type Kid = { id: string; firstName: string; lastName: string; currentClass: string };

// Pastilles pour passer d'un enfant à l'autre.
export function KidChips({ kids, current, hrefFor, all }: { kids: Kid[]; current?: string; hrefFor: (id?: string) => string; all?: string }) {
  const chip = "flex h-11 shrink-0 items-center gap-2 rounded-full text-sm font-semibold transition";
  const on = "bg-brand-600 text-white";
  const off = "bg-white text-ink shadow-[0_0_0_1px_rgb(15_23_42/0.07)] hover:bg-slate-50";
  return (
    <nav aria-label="Enfant" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {all && (
        <Link href={hrefFor()} aria-current={!current ? "page" : undefined} className={cx(chip, "px-4", !current ? on : off)}>
          {all}
        </Link>
      )}
      {kids.map((k) => (
        <Link key={k.id} href={hrefFor(k.id)} aria-current={current === k.id ? "page" : undefined} className={cx(chip, "pr-4 pl-1.5", current === k.id ? on : off)}>
          <Avatar name={`${k.firstName} ${k.lastName}`} size={32} className="ring-0" />
          {k.firstName} · {k.currentClass}
        </Link>
      ))}
    </nav>
  );
}

export function Bar({ widthClass, className }: { widthClass: string; className?: string }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100">
      <span className={cx("block h-full rounded-full bg-brand-600", widthClass, className)} />
    </span>
  );
}

// Bascule du catalogue : éducateurs (cours) ou tuteurs (suivi au quotidien).
export function CatalogSwitch({ current, query = "" }: { current: "educateurs" | "tuteurs"; query?: string }) {
  const items = [
    { key: "educateurs", href: `/parent/educateurs${query}`, label: "Éducateurs", hint: "Cours à domicile" },
    { key: "tuteurs", href: `/parent/tuteurs${query}`, label: "Tuteurs", hint: "Suivi au quotidien" },
  ] as const;
  return (
    <nav aria-label="Type d'intervenant" className="mb-4 grid grid-cols-2 gap-1 rounded-[18px] bg-slate-100 p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === current ? "page" : undefined}
          className={cx("rounded-[14px] px-3 py-2 text-center transition", i.key === current ? "bg-white shadow-[0_1px_2px_rgb(15_23_42/0.08)]" : "hover:bg-white/60")}
        >
          <span className={cx("block text-sm font-bold", i.key === current ? "text-ink" : "text-slate-600")}>{i.label}</span>
          <span className="block text-xs text-slate-500">{i.hint}</span>
        </Link>
      ))}
    </nav>
  );
}
