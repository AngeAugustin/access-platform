import { cx } from "@/components/ui";
import { heightClass } from "@/lib/ui-scale";

// Histogramme rendu côté serveur, sans dépendance ni style en ligne : une barre par mois, le dernier mis en avant.
export function MonthlyBars({ data, format = (v: number) => String(v) }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-52 items-stretch gap-3" role="img" aria-label={data.map((d) => `${d.label} : ${format(d.value)}`).join(", ")}>
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="h-4 text-[11px] font-medium text-slate-500 tabular-nums">{d.value ? format(d.value) : ""}</span>
          <div className="relative w-full max-w-10 flex-1 border-b border-slate-200">
            <div
              className={cx(
                "absolute inset-x-0 bottom-0 rounded-t-lg",
                i === data.length - 1 ? "bg-brand-500" : "bg-brand-200",
                d.value ? heightClass(Math.max(3, (d.value / max) * 100)) : "h-0",
              )}
            />
          </div>
          <span className="text-[11px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
