// Histogramme simple rendu côté serveur (aucune dépendance) : une barre par mois.
export function MonthlyBars({ title, data, format = (v: number) => String(v) }: { title: string; data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-slate-900">{title}</figcaption>
      <div className="flex h-40 items-end gap-2" role="img" aria-label={`${title} : ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] text-slate-600">{d.value ? format(d.value) : ""}</span>
            <div className="w-full rounded-t bg-brand-600" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }} />
            <span className="text-[11px] text-slate-500">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
