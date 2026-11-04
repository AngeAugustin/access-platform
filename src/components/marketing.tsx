import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";

// Briques visuelles des pages publiques (landing et pages d'information).

export const pill = "inline-flex h-14 items-center justify-center gap-2.5 rounded-full px-7 text-base font-semibold whitespace-nowrap transition";
export const pillDark = cx(pill, "bg-brand-600 text-white hover:bg-brand-700");
export const pillLight = cx(pill, "bg-white text-ink shadow-[inset_0_0_0_1px_#dbe1ec] hover:shadow-[inset_0_0_0_1px_#b6c0d3]");
export const pillAccent = cx(pill, "bg-accent-500 text-white hover:bg-accent-600");
export const eyebrow = "text-sm font-semibold tracking-[0.08em] text-brand-600 uppercase";
export const sectionTitle = "font-display text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.04] font-bold tracking-[-0.035em]";
export const cardTitle = "font-display text-2xl leading-tight font-bold tracking-tight";
export const dots = "bg-[radial-gradient(rgb(255_255_255/0.16)_1.2px,transparent_1.2px)] bg-[size:22px_22px]";

export function IconBox({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl", className)} aria-hidden>
      <Icon className="size-6" strokeWidth={1.8} />
    </span>
  );
}

// En-tête d'une page d'information.
export function PageHero({ eyebrow: label, title, children, actions }: { eyebrow: string; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
      <div className="max-w-3xl">
        <p className={eyebrow}>{label}</p>
        <h1 className="mt-3.5 font-display text-[clamp(2.5rem,5.6vw,4.5rem)] leading-[1.02] font-bold tracking-[-0.035em] text-ink">{title}</h1>
        {children && <div className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-[19px]">{children}</div>}
        {actions && <div className="mt-9 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </section>
  );
}

export function Section({ id, eyebrow: label, title, intro, children, className }: { id?: string; eyebrow?: string; title?: ReactNode; intro?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cx("mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6", className)}>
      {(label || title) && (
        <div className="max-w-3xl">
          {label && <p className={eyebrow}>{label}</p>}
          {title && <h2 className={cx("mt-3.5 text-ink", sectionTitle)}>{title}</h2>}
          {intro && <div className="mt-5 text-[17px] leading-relaxed text-slate-600">{intro}</div>}
        </div>
      )}
      <div className={cx(Boolean(label || title) && "mt-12")}>{children}</div>
    </section>
  );
}

// Étapes numérotées sur fond gris clair.
export function Steps({ items }: { items: { title: string; text: ReactNode }[] }) {
  return (
    <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <li key={s.title} className="rounded-[28px] bg-canvas p-7">
          <span className="block font-display text-6xl leading-none font-extrabold text-brand-100" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-7 font-display text-[22px] font-bold tracking-tight text-ink">{s.title}</h3>
          <div className="mt-2.5 text-15px leading-relaxed text-slate-600">{s.text}</div>
        </li>
      ))}
    </ol>
  );
}

export function FeatureCard({ icon, title, children, tone = "plain" }: { icon: LucideIcon; title: string; children: ReactNode; tone?: "plain" | "dark" | "warm" | "brand" }) {
  const tones = {
    plain: { card: "bg-white shadow-[0_0_0_1px_rgb(15_23_42/0.07)]", icon: "bg-brand-50 text-brand-600", text: "text-slate-600", title: "text-ink" },
    dark: { card: "bg-brand-600", icon: "bg-white/10 text-accent-400", text: "text-brand-200", title: "text-white" },
    warm: { card: "bg-accent-50", icon: "bg-white text-accent-600", text: "text-accent-900", title: "text-ink" },
    brand: { card: "bg-brand-600", icon: "bg-white/15 text-white", text: "text-brand-100", title: "text-white" },
  }[tone];
  return (
    <article className={cx("rounded-[28px] p-8", tones.card)}>
      <IconBox icon={icon} className={tones.icon} />
      <h3 className={cx("mt-6", cardTitle, tones.title)}>{title}</h3>
      <div className={cx("mt-2.5 text-15px leading-relaxed", tones.text)}>{children}</div>
    </article>
  );
}

export type Faq = { q: string; a: ReactNode };

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((f) => (
        <details key={f.q} className="group rounded-[22px] bg-canvas px-6">
          <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-xl leading-none transition group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <div className="pb-6 leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-brand-700 hover:[&_a]:underline">{f.a}</div>
        </details>
      ))}
    </div>
  );
}

// Bandeau d'appel à l'action en bas de page.
export function CtaBand({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative flex flex-col items-start justify-between gap-8 overflow-hidden rounded-[40px] bg-accent-500 px-7 py-12 text-white sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:px-18 lg:py-22">
        <svg viewBox="0 0 400 400" className="absolute -right-20 -bottom-40 size-[460px]" aria-hidden>
          <circle cx="200" cy="200" r="120" fill="none" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
          <circle cx="200" cy="200" r="180" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="2" />
        </svg>
        <h2 className="relative max-w-2xl font-display text-[clamp(2.25rem,4.8vw,4rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">{title}</h2>
        <div className="relative flex flex-wrap gap-3">
          {children ?? (
            <>
              <Link href="/inscription?role=PARENT" className={pillDark}>
                Inscrire mon enfant
              </Link>
              <Link href="/inscription?role=EDUCATOR" className={pillLight}>
                Devenir éducateur
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-[28px] bg-canvas px-7 py-10 text-center text-slate-600">{children}</p>;
}
