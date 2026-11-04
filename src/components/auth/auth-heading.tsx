import type { ReactNode } from "react";

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-[26px] leading-tight font-bold tracking-tight text-ink sm:text-[32px]">{title}</h1>
      {subtitle && <p className="mt-2 text-15px text-slate-500">{subtitle}</p>}
    </div>
  );
}
