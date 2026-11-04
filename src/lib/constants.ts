// Référentiels partagés entre le serveur et le navigateur (aucune donnée sensible ici).

// Les classes et les matières sont en base (voir src/lib/curriculum.ts).

export const SUBJECT_LEVELS = {
  WEAK: "Faible",
  AVERAGE: "Moyen",
  GOOD: "Bon",
  VERY_GOOD: "Très bon",
} as const;

// Cycles scolaires : chaque classe du référentiel en relève d'un, l'éducateur choisit les siens.
export const CYCLES = ["Primaire", "Secondaire 1", "Secondaire 2"] as const;

export const MARITAL_STATUSES = ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf / Veuve"] as const;

export const DEGREE_LEVELS = ["BAC", "BTS / DUT / DTS", "Licence", "Master", "Doctorat", "CAPES / CAPET / CAPEPS", "Autre diplôme"] as const;

export const OCCUPATIONS = [
  "Étudiant(e)",
  "Enseignant(e) en activité",
  "Enseignant(e) à la retraite",
  "Répétiteur / Répétitrice à plein temps",
  "Autre profession",
] as const;

export const MAX_EXPERIENCES = 8;

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

// Opérateurs Mobile Money vers lesquels FedaPay sait reverser au Bénin.
export const MOBILE_OPERATORS = {
  MTN: "MTN Mobile Money",
  MOOV: "Moov Money",
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
  TUTOR: "Tuteur",
  ADMIN: "Administrateur",
} as const;

export const ACCOUNT_STATUS = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DEACTIVATED: "Désactivé",
} as const;

export const ROLE_HOME = {
  PARENT: "/parent",
  EDUCATOR: "/educateur",
  TUTOR: "/tuteur",
  ADMIN: "/admin",
} as const;

// Paramètres métier par défaut (modifiables par l'administration, table Setting).
export const DEFAULT_SETTINGS = {
  commissionPercent: 15,
  maxDurationWeeks: 36,
  weeksPerInstallment: 4,
  // Suivi : forfait mensuel (FCFA) pour le premier enfant, puis par enfant supplémentaire, et commission Access.
  followUpFirstChild: 15000,
  followUpExtraChild: 10000,
  followUpCommissionPercent: 20,
} as const;

// Suivi (module tuteur).
export const TUTOR_REQUIRED_DOCUMENTS = ["ID_CARD", "CRIMINAL_RECORD", "PHOTO"] as const;

export const FOLLOW_UP_STATUS = {
  REQUESTED: "En attente du tuteur",
  ACTIVE: "Actif",
  DECLINED: "Refusé",
  CANCELLED: "Demande retirée",
  ENDED: "Arrêté",
} as const;

export const TASK_KINDS = {
  LESSONS: "Leçons apprises",
  HOMEWORK: "Devoirs faits",
  SCHOOL_VISIT: "Visite à l'école",
  OTHER: "Autre action",
} as const;

export type TaskKind = keyof typeof TASK_KINDS;

// Modèles proposés au parent : il les ajuste ensuite (enfants, jours, heure, consignes).
export const TASK_TEMPLATES: { kind: TaskKind; title: string; instructions: string; days: WeekdayKey[]; intervalWeeks: number; dueHour: number; photoRequired: boolean }[] = [
  { kind: "LESSONS", title: "Vérifier les leçons du jour", instructions: "Faire réciter les leçons du jour avant le coucher.", days: ["MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"], intervalWeeks: 1, dueHour: 21, photoRequired: false },
  { kind: "HOMEWORK", title: "S'assurer que les devoirs sont faits", instructions: "Vérifier les cahiers et faire terminer ce qui manque.", days: ["WEDNESDAY", "SUNDAY"], intervalWeeks: 1, dueHour: 20, photoRequired: true },
  { kind: "SCHOOL_VISIT", title: "Passer à l'école consulter les notes", instructions: "Rencontrer l'enseignant si possible et relever les dernières notes.", days: ["FRIDAY"], intervalWeeks: 2, dueHour: 17, photoRequired: false },
  { kind: "OTHER", title: "", instructions: "", days: ["SATURDAY"], intervalWeeks: 1, dueHour: 18, photoRequired: false },
];

export const TASK_INTERVALS = { 1: "Chaque semaine", 2: "Toutes les 2 semaines", 4: "Toutes les 4 semaines" } as const;

export const OCCURRENCE_RESULTS = {
  DONE: "Fait",
  PARTIAL: "En partie",
  NOT_DONE: "Non fait",
} as const;

// Délai laissé au tuteur après l'heure limite pour faire son retour (une action du soir peut être rapportée le lendemain matin).
export const REPORT_GRACE_HOURS = 14;
