import type { ReactNode } from "react";

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-[15px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
