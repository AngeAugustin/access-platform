import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Inbox, Star, type LucideIcon } from "lucide-react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

const buttonVariants = {
  primary: "bg-brand-600 text-white shadow-[0_1px_2px_rgb(75_72_227/0.3),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-brand-700 disabled:bg-brand-600/50",
  secondary: "border border-slate-200 bg-white text-slate-800 shadow-[0_1px_1px_rgb(15_23_42/0.04)] hover:border-slate-300 hover:bg-slate-50",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  "danger-soft": "bg-rose-50 text-rose-700 hover:bg-rose-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
} as const;

const buttonSizes = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-[15px]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string, size: ButtonSize = "md") {
  return cx(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4",
    buttonVariants[variant],
    buttonSizes[size],
    extra,
  );
}

type ButtonOwnProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant = "primary", size = "md", className, ...props }: ComponentProps<"button"> & ButtonOwnProps) {
  return <button className={buttonClass(variant, className, size)} {...props} />;
}

export function LinkButton({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & ButtonOwnProps) {
  return <Link className={buttonClass(variant, className, size)} {...props} />;
}

// ---------------------------------------------------------------------------
// Mise en page
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
  title,
  description,
  action,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-soft", className)}>
      {(title || action) && (
        <header className={cx("flex items-start justify-between gap-4", padded ? "px-5 pt-5 sm:px-6 sm:pt-6" : "border-b border-slate-100 px-5 py-4 sm:px-6")}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cx(padded && "p-5 sm:p-6", padded && Boolean(title || action) && "pt-4 sm:pt-4")}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  back,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: string;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      {back && (
        <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-700">
          <ChevronLeft className="size-4" aria-hidden />
          Retour
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[13px] font-medium text-brand-600">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
          {subtitle && <div className="mt-1.5 text-[15px] text-slate-500">{subtitle}</div>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold tracking-wide text-slate-500 uppercase">{children}</h2>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicateurs
// ---------------------------------------------------------------------------

const badgeTones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200/70",
  blue: "bg-brand-50 text-brand-700 ring-brand-200/60",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/70",
  red: "bg-rose-50 text-rose-700 ring-rose-200/70",
} as const;

const dotTones = { gray: "bg-slate-400", blue: "bg-brand-500", green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500" } as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "gray", children, dot = true }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", badgeTones[tone])}>
      {dot && <span className={cx("size-1.5 rounded-full", dotTones[tone])} aria-hidden />}
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{children}</span>;
}

const tileTones = {
  brand: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-100 text-slate-600",
} as const;

export function IconTile({ icon: Icon, tone = "brand", size = "md" }: { icon: LucideIcon; tone?: keyof typeof tileTones; size?: "sm" | "md" | "lg" }) {
  const box = { sm: "size-8 rounded-lg [&_svg]:size-4", md: "size-10 rounded-xl [&_svg]:size-5", lg: "size-12 rounded-2xl [&_svg]:size-6" }[size];
  return (
    <span className={cx("flex shrink-0 items-center justify-center", box, tileTones[tone])} aria-hidden>
      <Icon strokeWidth={1.75} />
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  icon?: LucideIcon;
  tone?: keyof typeof tileTones;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && <IconTile icon={icon} tone={tone} size="sm" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums sm:text-[28px]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = "group block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft sm:p-5";
  return href ? (
    <Link href={href} className={cx(cls, "transition hover:border-brand-200 hover:shadow-lift")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Notice({ tone = "blue", title, children, action, icon: Icon }: { tone?: "blue" | "amber" | "red" | "green"; title?: ReactNode; children?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  const styles = {
    blue: "border-brand-200/70 bg-brand-50/70 text-brand-900 [&_svg]:text-brand-600",
    amber: "border-amber-200 bg-amber-50 text-amber-900 [&_svg]:text-amber-600",
    red: "border-rose-200 bg-rose-50 text-rose-900 [&_svg]:text-rose-600",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600",
  }[tone];
  return (
    <div className={cx("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between", styles)}>
      <div className="flex gap-3">
        {Icon && <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />}
        <div className="text-sm">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={cx(Boolean(title) && "mt-0.5", "opacity-90")}>{children}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, children, icon: Icon = Inbox, action }: { title: string; children?: ReactNode; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500" aria-hidden>
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listes et tableaux
// ---------------------------------------------------------------------------

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cx("divide-y divide-slate-100", className)}>{children}</ul>;
}

// Ligne de liste cliquable : titre, informations secondaires, élément de droite.
export function ListRow({
  href,
  title,
  meta,
  trailing,
  leading,
}: {
  href?: string;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
}) {
  const inner = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink">{title}</p>
        {meta && <div className="mt-0.5 text-[13px] text-slate-500">{meta}</div>}
      </div>
      {trailing && <div className="flex shrink-0 flex-col items-end gap-1 text-right">{trailing}</div>}
      {href && <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-brand-500" aria-hidden />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-3">{inner}</div>
      )}
    </li>
  );
}

export function Table({ head, children, bare = false }: { head: ReactNode[]; children: ReactNode; bare?: boolean }) {
  return (
    <div className={cx("scroll-x overflow-x-auto", !bare && "rounded-2xl border border-slate-200/80 bg-white px-5 pb-1 shadow-soft sm:px-6")}>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-slate-500 first:pl-0 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cx("px-3 py-3 align-middle text-slate-700 first:pl-0 last:pr-0", className)}>{children}</td>;
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[13px] text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-[15px] font-medium break-words text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stars({ value, size = "sm" }: { value: number | null | undefined; size?: "sm" | "md" }) {
  if (!value) return <span className="text-xs text-slate-400">Pas encore noté</span>;
  const rounded = Math.round(value);
  const cls = size === "md" ? "size-4" : "size-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cx(cls, i <= rounded ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200")} aria-hidden />
      ))}
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:text-brand-800">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}
