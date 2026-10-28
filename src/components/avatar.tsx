/* eslint-disable @next/next/no-img-element -- photo servie par une route protégée, sans optimisation d'image */
import { cx } from "@/components/ui";

const palettes = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function paletteFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

export function Avatar({ documentId, name, size = 40, className }: { documentId?: string | null; name: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (documentId) {
    return <img src={`/api/fichiers/${documentId}`} alt={name} width={size} height={size} className={cx("shrink-0 rounded-full object-cover ring-2 ring-white", className)} style={style} />;
  }
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white", paletteFor(name), className)} style={style} aria-hidden>
      {initials}
    </span>
  );
}
