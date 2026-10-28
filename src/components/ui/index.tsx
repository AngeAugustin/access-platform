import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const buttonStyles = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/60",
  secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-brand-700 hover:bg-brand-50",
} as const;

export type ButtonVariant = keyof typeof buttonStyles;

export function buttonClass(variant: ButtonVariant = "primary", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed",
    buttonStyles[variant],
    extra,
  );
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && (
          <Link href={back} className="mb-1 inline-block text-sm text-brand-700 hover:underline">
            ← Retour
          </Link>
        )}
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-brand-100 text-brand-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTones[tone])}>{children}</span>;
}

export function Stat({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  return href ? (
    <Link href={href} className={cx(cls, "hover:border-brand-600")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-600">{children}</div>}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700">
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
  return <td className={cx("px-3 py-2 align-top", className)}>{children}</td>;
}

export function DefinitionList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 text-sm text-slate-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stars({ value }: { value: number | null | undefined }) {
  if (!value) return <span className="text-slate-400">Non noté</span>;
  const rounded = Math.round(value);
  return (
    <span className="text-accent-500" aria-label={`${value.toFixed(1)} sur 5`}>
      {"★".repeat(rounded)}
      <span className="text-slate-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
