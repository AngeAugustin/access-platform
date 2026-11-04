// Traduction des événements du journal d'audit en phrases lisibles par un administrateur.
// Le code technique (« user.login_failed ») reste stocké tel quel ; seul l'affichage change.

import { ACCOUNT_STATUS, COMPLAINT_STATUS, DOCUMENT_TYPES, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime, formatFcfa } from "@/lib/format";
import { LOCK_AFTER_FAILURES } from "@/lib/auth/lockout";

export const AUDIT_CATEGORIES = {
  alertes: "Alertes",
  acces: "Connexions",
  comptes: "Comptes",
  educateurs: "Dossiers éducateurs",
  tutorats: "Accompagnements et séances",
  paiements: "Paiements",
  configuration: "Configuration",
} as const;

export type AuditCategory = Exclude<keyof typeof AUDIT_CATEGORIES, "alertes">;
export type AuditTone = "brand" | "accent" | "green" | "amber" | "rose" | "slate";
export type AuditIcon =
  | "login"
  | "lock"
  | "unlock"
  | "key"
  | "user"
  | "ban"
  | "file"
  | "check"
  | "x"
  | "book"
  | "pause"
  | "wallet"
  | "send"
  | "alert"
  | "settings"
  | "mail";

type Meta = Record<string, unknown>;
type Definition = {
  title: string | ((m: Meta) => string);
  category: AuditCategory;
  tone: AuditTone;
  icon: AuditIcon;
  // Événement à surveiller : affiché en rouge et regroupé sous « Alertes ».
  alert?: boolean;
  details?: (m: Meta) => string | null;
};

const STEPS: Record<string, string> = { profil: "profil", parcours: "parcours", cours: "cours", garants: "garants et paiement", pieces: "pièces" };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);
const label = <T extends Record<string, string>>(map: T, v: unknown) => (typeof v === "string" && v in map ? map[v as keyof T] : null);
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

const DEFINITIONS: Record<string, Definition> = {
  "user.login": { title: "Connexion", category: "acces", tone: "brand", icon: "login" },
  "user.login_failed": {
    title: "Mot de passe erroné",
    category: "acces",
    tone: "amber",
    icon: "key",
    alert: true,
    details: (m) => (num(m.attempt) ? `Tentative ${m.attempt} sur ${LOCK_AFTER_FAILURES} avant verrouillage` : null),
  },
  "user.locked": {
    title: "Compte verrouillé",
    category: "acces",
    tone: "rose",
    icon: "lock",
    alert: true,
    details: (m) => [num(m.failures) && `Après ${plural(num(m.failures)!, "échec")}`, str(m.until) && `jusqu'au ${formatDateTime(str(m.until))}`].filter(Boolean).join(", ") || null,
  },
  "user.login_blocked": { title: "Connexion bloquée : compte verrouillé", category: "acces", tone: "rose", icon: "lock", alert: true },
  "user.login_refused": {
    title: "Connexion refusée",
    category: "acces",
    tone: "rose",
    icon: "ban",
    alert: true,
    details: (m) => (label(ACCOUNT_STATUS, m.status) ? `Compte ${label(ACCOUNT_STATUS, m.status)!.toLowerCase()}` : null),
  },
  "user.reset_requested": { title: "Lien de réinitialisation demandé", category: "acces", tone: "slate", icon: "mail" },
  "user.reset_done": { title: "Mot de passe réinitialisé", category: "acces", tone: "brand", icon: "key" },
  "user.password_changed": {
    title: (m) => (m.provisional ? "Mot de passe provisoire remplacé" : "Mot de passe modifié"),
    category: "acces",
    tone: "brand",
    icon: "key",
  },

  "user.register": {
    title: (m) => (label(ROLE_LABELS, m.role) ? `Inscription : ${label(ROLE_LABELS, m.role)!.toLowerCase()}` : "Inscription"),
    category: "comptes",
    tone: "green",
    icon: "user",
  },
  "user.suspend": { title: "Compte suspendu", category: "comptes", tone: "rose", icon: "ban", details: previousStatus },
  "user.deactivate": { title: "Compte désactivé", category: "comptes", tone: "rose", icon: "ban", details: previousStatus },
  "user.reactivate": { title: "Compte réactivé", category: "comptes", tone: "green", icon: "check", details: previousStatus },
  "user.unlock": {
    title: "Compte déverrouillé",
    category: "comptes",
    tone: "green",
    icon: "unlock",
    details: (m) => (num(m.failedLogins) ? `${plural(num(m.failedLogins)!, "échec")} de connexion effacé${num(m.failedLogins)! > 1 ? "s" : ""}` : null),
  },
  "user.password_reset_by_admin": { title: "Mot de passe provisoire attribué", category: "comptes", tone: "amber", icon: "key" },
  "admin.create": { title: "Administrateur ajouté", category: "comptes", tone: "brand", icon: "user" },

  "educator.profile_saved": {
    title: "Dossier mis à jour",
    category: "educateurs",
    tone: "slate",
    icon: "file",
    details: (m) => (str(m.step) ? `Étape « ${STEPS[str(m.step)!] ?? str(m.step)} »` : null),
  },
  "educator.document_uploaded": {
    title: "Pièce justificative déposée",
    category: "educateurs",
    tone: "slate",
    icon: "file",
    details: (m) => label(DOCUMENT_TYPES, m.type),
  },
  "educator.profile_submitted": { title: "Dossier transmis pour validation", category: "educateurs", tone: "accent", icon: "send" },
  "educator.validate": {
    title: "Dossier validé",
    category: "educateurs",
    tone: "green",
    icon: "check",
    details: (m) =>
      [num(m.stars) && `${plural(num(m.stars)!, "étoile")}`, Array.isArray(m.cycles) && m.cycles.length > 0 && m.cycles.join(", ")].filter(Boolean).join(" · ") || null,
  },
  "educator.reject": { title: "Dossier refusé", category: "educateurs", tone: "rose", icon: "x", details: (m) => quote(m.reason) },

  "tutoring.create": { title: "Accompagnement créé", category: "tutorats", tone: "green", icon: "book" },
  "tutoring.stop": { title: "Accompagnement arrêté", category: "tutorats", tone: "amber", icon: "pause", details: (m) => quote(m.reason) },
  "lesson.confirmed": { title: "Séance confirmée par le parent", category: "tutorats", tone: "green", icon: "check" },
  "lesson.disputed": { title: "Séance contestée par le parent", category: "tutorats", tone: "rose", icon: "alert", alert: true },
  "lesson.dispute_confirmed": { title: "Contestation tranchée : séance maintenue", category: "tutorats", tone: "brand", icon: "check" },
  "lesson.dispute_remove": { title: "Contestation tranchée : séance retirée", category: "tutorats", tone: "amber", icon: "x" },
  "complaint.handle": {
    title: "Réclamation traitée",
    category: "tutorats",
    tone: "brand",
    icon: "mail",
    details: (m) => (label(COMPLAINT_STATUS, m.status) ? `Statut : ${label(COMPLAINT_STATUS, m.status)!.toLowerCase()}` : null),
  },

  "payment.start": { title: "Paiement lancé", category: "paiements", tone: "slate", icon: "wallet", details: transaction },
  "payment.approved": { title: "Paiement reçu", category: "paiements", tone: "green", icon: "wallet", details: transaction },
  "payment.duplicate": { title: "Paiement en double", category: "paiements", tone: "rose", icon: "alert", alert: true, details: transaction },
  "payment.amount_mismatch": {
    title: "Montant payé incorrect",
    category: "paiements",
    tone: "rose",
    icon: "alert",
    alert: true,
    details: (m) => (num(m.paid) !== null && num(m.expected) !== null ? `${formatFcfa(num(m.paid)!)} reçus au lieu de ${formatFcfa(num(m.expected)!)}` : null),
  },
  "payment.anomaly_resolved": { title: "Anomalie de paiement close", category: "paiements", tone: "brand", icon: "check", details: (m) => quote(m.note) },
  "payout.fedapay_started": { title: "Reversement lancé via FedaPay", category: "paiements", tone: "accent", icon: "send" },
  "payout.confirmed": { title: "Reversement confirmé par l'opérateur", category: "paiements", tone: "green", icon: "check" },
  "payout.failed": { title: "Reversement échoué", category: "paiements", tone: "rose", icon: "alert", alert: true, details: (m) => (str(m.status) ? `Statut FedaPay : ${m.status}` : null) },
  "payout.manual": {
    title: "Reversement manuel enregistré",
    category: "paiements",
    tone: "green",
    icon: "send",
    details: (m) => (str(m.providerReference) ? `Référence opérateur ${m.providerReference}` : null),
  },

  "tariff.save": {
    title: "Tarif modifié",
    category: "configuration",
    tone: "slate",
    icon: "settings",
    details: (m) =>
      num(m.hourlyRate) ? `${formatFcfa(num(m.hourlyRate)!)} / h · ${m.sessionsPerWeek ?? "?"} séance(s) de ${m.hoursPerSession ?? "?"} h par semaine` : null,
  },
  "settings.save": {
    title: "Paramètres généraux modifiés",
    category: "configuration",
    tone: "slate",
    icon: "settings",
    details: (m) =>
      num(m.commissionPercent) !== null
        ? `Commission ${m.commissionPercent} % · ${m.maxDurationWeeks} sem. max · échéance toutes les ${m.weeksPerInstallment} sem.`
        : null,
  },
  "subject.create": { title: "Matière ajoutée", category: "configuration", tone: "slate", icon: "settings" },
  "subject.update": { title: "Matière modifiée", category: "configuration", tone: "slate", icon: "settings", details: (m) => (m.active === false ? "Masquée" : null) },
  "subject.delete": { title: "Matière supprimée", category: "configuration", tone: "slate", icon: "x" },
  "subject.reorder": { title: "Ordre des matières modifié", category: "configuration", tone: "slate", icon: "settings" },
  "class.create": { title: "Classe ajoutée", category: "configuration", tone: "slate", icon: "settings" },
  "class.update": {
    title: "Classe modifiée",
    category: "configuration",
    tone: "slate",
    icon: "settings",
    details: (m) => [str(m.from) && `Renommée depuis « ${m.from} »`, m.active === false && "Masquée"].filter(Boolean).join(" · ") || null,
  },
  "class.delete": { title: "Classe supprimée", category: "configuration", tone: "slate", icon: "x" },
  "class.reorder": { title: "Ordre des classes modifié", category: "configuration", tone: "slate", icon: "settings" },
  "contact.message": {
    title: "Message reçu via le formulaire de contact",
    category: "comptes",
    tone: "accent",
    icon: "mail",
    details: (m) => [str(m.subject), str(m.email)].filter(Boolean).join(" · ") || null,
  },
};

function previousStatus(m: Meta) {
  return label(ACCOUNT_STATUS, m.from) ? `Auparavant : ${label(ACCOUNT_STATUS, m.from)!.toLowerCase()}` : null;
}

function transaction(m: Meta) {
  return m.transactionId != null ? `Transaction FedaPay ${m.transactionId}` : null;
}

function quote(v: unknown) {
  return str(v) ? `« ${str(v)} »` : null;
}

export type AuditDescription = {
  title: string;
  details: string | null;
  category: AuditCategory;
  tone: AuditTone;
  icon: AuditIcon;
  alert: boolean;
};

export function describeAudit(action: string, metadata: unknown): AuditDescription {
  const m: Meta = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Meta) : {};
  const d = DEFINITIONS[action];
  // Action inconnue (ajoutée sans libellé) : on montre le code plutôt que de la masquer.
  if (!d) return { title: action, details: null, category: "configuration", tone: "slate", icon: "settings", alert: false };
  return {
    title: typeof d.title === "function" ? d.title(m) : d.title,
    details: d.details?.(m) ?? null,
    category: d.category,
    tone: d.tone,
    icon: d.icon,
    alert: !!d.alert,
  };
}

// Codes d'action correspondant à un filtre, pour la requête en base.
export function actionsFor(filter: keyof typeof AUDIT_CATEGORIES): string[] {
  return Object.entries(DEFINITIONS)
    .filter(([, d]) => (filter === "alertes" ? d.alert : d.category === filter))
    .map(([action]) => action);
}
