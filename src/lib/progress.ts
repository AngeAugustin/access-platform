// Avancement d'un tutorat, en pourcentage de la période prévue (0 à 100).
export function tutoringProgress(start: Date, end: Date, now = new Date()): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.round(Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total)) * 100);
}
