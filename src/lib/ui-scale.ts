// Classes de largeur et de hauteur par pas de 5 % : remplacent les styles en ligne,
// interdits par la Content-Security-Policy (style-src sans 'unsafe-inline').
// Les noms de classes sont écrits en entier pour que Tailwind les génère.

const WIDTHS = [
  "w-[0%]",
  "w-[5%]",
  "w-[10%]",
  "w-[15%]",
  "w-[20%]",
  "w-[25%]",
  "w-[30%]",
  "w-[35%]",
  "w-[40%]",
  "w-[45%]",
  "w-[50%]",
  "w-[55%]",
  "w-[60%]",
  "w-[65%]",
  "w-[70%]",
  "w-[75%]",
  "w-[80%]",
  "w-[85%]",
  "w-[90%]",
  "w-[95%]",
  "w-[100%]",
] as const;

const HEIGHTS = [
  "h-[0%]",
  "h-[5%]",
  "h-[10%]",
  "h-[15%]",
  "h-[20%]",
  "h-[25%]",
  "h-[30%]",
  "h-[35%]",
  "h-[40%]",
  "h-[45%]",
  "h-[50%]",
  "h-[55%]",
  "h-[60%]",
  "h-[65%]",
  "h-[70%]",
  "h-[75%]",
  "h-[80%]",
  "h-[85%]",
  "h-[90%]",
  "h-[95%]",
  "h-[100%]",
] as const;

function step(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.round(Math.min(100, Math.max(0, percent)) / 5);
}

export function widthClass(percent: number): string {
  return WIDTHS[step(percent)];
}

export function heightClass(percent: number): string {
  return HEIGHTS[step(percent)];
}
