// Référentiels partagés entre le serveur et le navigateur (aucune donnée sensible ici).

export const CLASS_LEVELS = [
  "6ème",
  "5ème",
  "4ème ML",
  "4ème MC",
  "3ème ML",
  "3ème MC",
  "2nde AB",
  "2nde CD",
  "2nde G2",
  "1ère AB",
  "1ère C",
  "1ère D",
  "1ère G2",
  "Tle AB",
  "Tle C",
  "Tle D",
  "Tle G2",
] as const;

export const SUBJECTS = {
  francais: "Français",
  anglais: "Anglais",
  allemand: "Allemand",
  espagnol: "Espagnol",
  philosophie: "Philosophie",
  mathematiques: "Mathématiques",
  svt: "SVT",
  pct: "PCT",
  histgeo: "Histoire-Géographie",
  economie: "Économie",
  comptabilite: "Comptabilité",
  comptagenerale: "Comptabilité générale",
  comptaanalytique: "Comptabilité analytique",
  comptasociete: "Comptabilité des sociétés",
  comptausuelle: "Comptabilité usuelle",
  ta: "Techniques administratives",
  mathsfinancieres: "Mathématiques financières",
  mathsgenerales: "Mathématiques générales",
  droit: "Droit",
  fiscalite: "Fiscalité",
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
export const SUBJECT_KEYS = Object.keys(SUBJECTS) as SubjectKey[];

const COLLEGE: SubjectKey[] = ["francais", "mathematiques", "anglais", "svt", "pct", "histgeo", "allemand", "espagnol"];
const SERIE_AB: SubjectKey[] = ["francais", "anglais", "svt", "philosophie", "mathematiques", "allemand", "espagnol", "histgeo"];
const SERIE_CD: SubjectKey[] = ["francais", "anglais", "pct", "svt", "histgeo", "philosophie", "mathematiques"];

// Matières évaluées selon la classe (reprise des règles de l'application d'origine).
export function subjectsForClass(classLevel: string): SubjectKey[] {
  if (["6ème", "5ème", "4ème ML", "4ème MC", "3ème ML", "3ème MC"].includes(classLevel)) return COLLEGE;
  if (["2nde AB", "1ère AB", "Tle AB"].includes(classLevel)) return SERIE_AB;
  if (["2nde CD", "1ère C", "1ère D", "Tle C", "Tle D"].includes(classLevel)) return SERIE_CD;
  if (classLevel === "2nde G2")
    return ["francais", "anglais", "economie", "comptabilite", "ta", "mathsfinancieres", "droit", "mathsgenerales"];
  if (classLevel === "1ère G2")
    return ["anglais", "francais", "ta", "comptagenerale", "comptausuelle", "mathsgenerales", "mathsfinancieres", "economie", "droit"];
  if (classLevel === "Tle G2")
    return ["francais", "anglais", "droit", "economie", "comptasociete", "comptaanalytique", "fiscalite", "mathsfinancieres", "mathsgenerales", "philosophie"];
  return [];
}

export const SUBJECT_LEVELS = {
  WEAK: "Faible",
  AVERAGE: "Moyen",
  GOOD: "Bon",
  VERY_GOOD: "Très bon",
} as const;

export const EDUCATOR_LEVELS = ["Cycle I", "Cycle II", "Cycle III"] as const;

export const WEEKDAYS = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
} as const;

export const TIME_SLOTS = {
  S08_11: "08h-11h",
  S11_14: "11h-14h",
  S14_17: "14h-17h",
  S17_20: "17h-20h",
} as const;

export type WeekdayKey = keyof typeof WEEKDAYS;
export type TimeSlotKey = keyof typeof TIME_SLOTS;

export const MAX_AVAILABILITIES = 6;

export const DOCUMENT_TYPES = {
  ID_CARD: "Carte d'identité",
  CRIMINAL_RECORD: "Casier judiciaire",
  ACADEMIC_DIPLOMA: "Diplôme académique",
  PROFESSIONAL_DIPLOMA: "Diplôme professionnel",
  PHOTO: "Photo",
} as const;

export const REQUIRED_DOCUMENTS = ["ID_CARD", "CRIMINAL_RECORD", "ACADEMIC_DIPLOMA", "PHOTO"] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const PROFILE_STATUS = {
  INCOMPLETE: "Dossier incomplet",
  SUBMITTED: "En attente de validation",
  VALIDATED: "Vérifié",
  REJECTED: "Rejeté",
} as const;

export const TUTORING_STATUS = {
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  STOPPED: "Arrêté",
} as const;

export const LESSON_STATUS = {
  RECORDED: "À confirmer",
  CONFIRMED: "Confirmée",
  DISPUTED: "Contestée",
} as const;

export const INSTALLMENT_STATUS = {
  PENDING: "À payer",
  PAID: "Payée",
  CANCELLED: "Annulée",
} as const;

export const PAYOUT_STATUS = {
  PENDING: "À reverser",
  PROCESSING: "En cours",
  DONE: "Reversé",
  FAILED: "Échec",
} as const;

export const COMPLAINT_STATUS = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours de traitement",
  RESOLVED: "Résolue",
  REJECTED: "Rejetée",
} as const;

export const COMPLAINT_SUBJECTS = [
  "Absence ou retard de l'éducateur",
  "Qualité de l'accompagnement",
  "Paiement",
  "Problème technique",
  "Comportement",
  "Autre",
] as const;

export const ROLE_LABELS = {
  PARENT: "Parent",
  EDUCATOR: "Éducateur",
  ADMIN: "Administrateur",
} as const;

export const ROLE_HOME = {
  PARENT: "/parent",
  EDUCATOR: "/educateur",
  ADMIN: "/admin",
} as const;

// Paramètres métier par défaut (modifiables par l'administration, table Setting).
export const DEFAULT_SETTINGS = {
  commissionPercent: 15,
  maxDurationWeeks: 36,
  weeksPerInstallment: 4,
} as const;
