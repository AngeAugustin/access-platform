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

// Tailles disponibles (pixels) et classes correspondantes : pas de style en ligne (CSP).
const SIZES: [number, string][] = [
  [24, "size-6 text-[9px]"],
  [32, "size-8 text-xs"],
  [34, "size-[34px] text-[13px]"],
  [36, "size-9 text-sm"],
  [40, "size-10 text-[15px]"],
  [44, "size-11 text-base"],
  [48, "size-12 text-lg"],
  [52, "size-13 text-xl"],
  [64, "size-16 text-2xl"],
  [72, "size-18 text-[27px]"],
  [84, "size-21 text-[32px]"],
];

function sizeClass(size: number) {
  return SIZES.reduce((best, cur) => (Math.abs(cur[0] - size) < Math.abs(best[0] - size) ? cur : best))[1];
}

export function Avatar({ documentId, name, size = 40, className }: { documentId?: string | null; name: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (documentId) {
    return <img src={`/api/fichiers/${documentId}`} alt={name} width={size} height={size} className={cx("shrink-0 rounded-full object-cover ring-2 ring-white", sizeClass(size), className)} />;
  }
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white", paletteFor(name), sizeClass(size), className)} aria-hidden>
      {initials}
    </span>
  );
}
