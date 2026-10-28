// Histogramme rendu côté serveur, sans dépendance : une barre par mois, le dernier mois mis en avant.
export function MonthlyBars({ data, format = (v: number) => String(v) }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-6 bottom-6 flex flex-col justify-between" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border-t border-dashed border-slate-100" />
        ))}
      </div>
      <div className="relative flex h-48 items-end gap-3" role="img" aria-label={data.map((d) => `${d.label} : ${format(d.value)}`).join(", ")}>
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 tabular-nums">{d.value ? format(d.value) : ""}</span>
            <div
              className={i === data.length - 1 ? "w-full max-w-10 rounded-t-lg bg-brand-500" : "w-full max-w-10 rounded-t-lg bg-brand-200"}
              style={{ height: `calc(${(d.value / max) * 100}% - 2.5rem)`, minHeight: d.value ? 4 : 2 }}
            />
            <span className="text-[11px] text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
