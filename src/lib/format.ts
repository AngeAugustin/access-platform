// Formatage pour l'affichage (fuseau horaire du Bénin, UTC+1).

import { MOBILE_OPERATORS } from "@/lib/constants";

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

// Âge révolu à une date donnée.
// Compte de reversement : « 0197000000 · MTN Mobile Money », ou null sans numéro.
export function payoutAccount(p: { payoutPhone: string | null; payoutOperator: keyof typeof MOBILE_OPERATORS | null }): string | null {
  if (!p.payoutPhone) return null;
  return p.payoutOperator ? `${p.payoutPhone} · ${MOBILE_OPERATORS[p.payoutOperator]}` : p.payoutPhone;
}

export function age(birthDate: Date, at: Date = new Date()): number {
  const years = at.getFullYear() - birthDate.getFullYear();
  return at < new Date(at.getFullYear(), birthDate.getMonth(), birthDate.getDate()) ? years - 1 : years;
}

// Lien WhatsApp vers un numéro béninois (01XXXXXXXX ou +22901XXXXXXXX).
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("229") ? digits : `229${digits}`}`;
}
