// Formatage pour l'affichage (fuseau horaire du Bénin, UTC+1).

const TZ = "Africa/Porto-Novo";

const money = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatFcfa(amount: number): string {
  return `${money.format(amount)} FCFA`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(date),
  );
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Date du jour au format AAAA-MM-JJ dans le fuseau du Bénin (valeur par défaut des champs date).
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName.toUpperCase()}`;
}
