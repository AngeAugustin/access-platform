// Avancement d'un tutorat, en pourcentage de la période prévue (0 à 100).
export function tutoringProgress(start: Date, end: Date, now = new Date()): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.round(Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total)) * 100);
}

// Semaine en cours d'un tutorat (1 à `weeks`).
export function currentWeek(start: Date, weeks: number, now = new Date()): number {
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(weeks, Math.max(1, elapsed));
}
