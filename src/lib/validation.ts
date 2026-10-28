import { z } from "zod";
import {
  CLASS_LEVELS,
  COMPLAINT_SUBJECTS,
  EDUCATOR_LEVELS,
  MAX_AVAILABILITIES,
  SUBJECT_KEYS,
  SUBJECT_LEVELS,
  TIME_SLOTS,
  WEEKDAYS,
} from "@/lib/constants";

// État renvoyé par les actions serveur aux formulaires (useActionState).
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Le serveur exige une vérification anti-robot avant de traiter la demande.
  powRequired?: boolean;
};

export function fieldErrors(error: z.ZodError): ActionState {
  return { ok: false, message: "Certains champs sont invalides.", errors: z.flattenError(error).fieldErrors };
}

const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);
const required = (max: number, label = "Ce champ") => text(max).min(1, `${label} est obligatoire.`);
const optional = (max: number) =>
  text(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const npiSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Le NPI comporte 10 chiffres.");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^(\+229)?\d{8,10}$/, "Numéro de téléphone béninois invalide."));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Adresse e-mail invalide." }).max(160));

export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(128, "128 caractères maximum.")
  .regex(/[A-Za-z]/, "Au moins une lettre.")
  .regex(/\d/, "Au moins un chiffre.");

const dateString = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} invalide.`)
    .transform((v) => new Date(`${v}T00:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), `${label} invalide.`);

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    role: z.enum(["PARENT", "EDUCATOR"], { error: "Choisissez un type de compte." }),
    npi: npiSchema,
    firstName: required(80, "Le prénom"),
    lastName: required(80, "Le nom"),
    email: emailSchema,
    phone: phoneSchema,
    city: optional(80),
    address: optional(200),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", { error: "Vous devez accepter les conditions d'utilisation." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Les mots de passe ne correspondent pas.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: z.string().trim().regex(/^\d{6}$/, "Le code comporte 6 chiffres."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Les mots de passe ne correspondent pas.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est obligatoire."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Les mots de passe ne correspondent pas.",
  });

export const profileSchema = z.object({
  firstName: required(80, "Le prénom"),
  lastName: required(80, "Le nom"),
  phone: phoneSchema,
  city: optional(80),
  address: optional(200),
});

// ---------------------------------------------------------------------------
// Enfants
// ---------------------------------------------------------------------------

const classLevel = z.enum(CLASS_LEVELS, { error: "Classe invalide." });

export const childSchema = z.object({
  npi: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(npiSchema.optional()),
  firstName: required(80, "Le prénom"),
  lastName: required(80, "Le nom"),
  sex: z.enum(["F", "M"], { error: "Sexe invalide." }),
  birthDate: dateString("Date de naissance").refine((d) => d < new Date(), "La date doit être passée."),
  previousClass: optional(40),
  previousSchool: optional(120),
  currentClass: classLevel,
  currentSchool: optional(120),
  favoriteSubjects: optional(300),
  interests: optional(300),
  levels: z.record(z.enum(SUBJECT_KEYS), z.enum(Object.keys(SUBJECT_LEVELS) as [keyof typeof SUBJECT_LEVELS])),
});

// ---------------------------------------------------------------------------
// Éducateurs
// ---------------------------------------------------------------------------

const weekday = z.enum(Object.keys(WEEKDAYS) as [keyof typeof WEEKDAYS]);
const timeSlot = z.enum(Object.keys(TIME_SLOTS) as [keyof typeof TIME_SLOTS]);

export const slotSchema = z.object({ day: weekday, slot: timeSlot });

export const educatorProfileSchema = z.object({
  birthDate: dateString("Date de naissance"),
  maritalStatus: required(40, "La situation matrimoniale"),
  experienceYears: z.coerce.number().int().min(0, "Valeur invalide.").max(60, "Valeur invalide."),
  background: required(2000, "Le parcours"),
  bio: optional(1000),
  zone: required(80, "La zone d'intervention"),
  subjects: z.array(z.enum(SUBJECT_KEYS)).min(1, "Choisissez au moins une matière."),
  classLevels: z.array(classLevel).min(1, "Choisissez au moins une classe."),
  guarantor1Name: required(120, "Le garant 1"),
  guarantor1Address: required(200, "L'adresse du garant 1"),
  guarantor1Phone: phoneSchema,
  guarantor2Name: required(120, "Le garant 2"),
  guarantor2Address: required(200, "L'adresse du garant 2"),
  guarantor2Phone: phoneSchema,
  payoutPhone: phoneSchema,
  availabilities: z
    .array(slotSchema)
    .min(1, "Indiquez au moins une disponibilité.")
    .max(MAX_AVAILABILITIES, `${MAX_AVAILABILITIES} disponibilités maximum.`),
});

export const lessonSchema = z.object({
  tutoringId: z.string().min(1),
  date: dateString("Date de la séance").refine(
    (d) => d.getTime() <= Date.now() + 24 * 60 * 60 * 1000,
    "Une séance ne peut pas être saisie à l'avance.",
  ),
  slot: timeSlot,
  workDone: required(2000, "Le travail effectué"),
  observation: optional(2000),
});

// ---------------------------------------------------------------------------
// Tutorats
// ---------------------------------------------------------------------------

export const tutoringSchema = z.object({
  childId: z.string().min(1, "Choisissez un enfant."),
  educatorId: z.string().min(1),
  durationWeeks: z.coerce.number().int("Nombre entier de semaines.").min(1, "1 semaine minimum."),
  startDate: dateString("Date de début"),
  slots: z.array(slotSchema).min(1, "Choisissez les créneaux."),
});

export const stopTutoringSchema = z.object({
  tutoringId: z.string().min(1),
  reason: required(500, "Le motif"),
});

export const lessonReviewSchema = z.object({
  lessonId: z.string().min(1),
  decision: z.enum(["CONFIRMED", "DISPUTED"]),
  comment: optional(500),
});

export const reviewSchema = z.object({
  tutoringId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Note de 1 à 5.").max(5, "Note de 1 à 5."),
  comment: optional(1000),
});

// ---------------------------------------------------------------------------
// Réclamations
// ---------------------------------------------------------------------------

export const complaintSchema = z.object({
  subject: z.enum(COMPLAINT_SUBJECTS, { error: "Motif invalide." }),
  details: required(3000, "Le détail"),
});

export const complaintHandlingSchema = z.object({
  complaintId: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "RESOLVED", "REJECTED"]),
  response: required(3000, "La réponse"),
});

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export const validateEducatorSchema = z.object({
  educatorId: z.string().min(1),
  stars: z.coerce.number().int().min(1, "Note de 1 à 5.").max(5, "Note de 1 à 5."),
  level: z.enum(EDUCATOR_LEVELS, { error: "Niveau invalide." }),
});

export const rejectEducatorSchema = z.object({
  educatorId: z.string().min(1),
  reason: required(1000, "Le motif du rejet"),
});

export const tariffSchema = z.object({
  classLevel,
  hourlyRate: z.coerce.number().int().min(100, "Montant trop faible.").max(100000, "Montant trop élevé."),
  sessionsPerWeek: z.coerce.number().int().min(1).max(7),
  hoursPerSession: z.coerce.number().int().min(1).max(3, "3 heures maximum (taille d'un créneau)."),
});

export const settingsSchema = z.object({
  commissionPercent: z.coerce.number().int().min(0).max(50, "50 % maximum."),
  maxDurationWeeks: z.coerce.number().int().min(1).max(52),
  weeksPerInstallment: z.coerce.number().int().min(1).max(8),
});

export const createAdminSchema = z.object({
  npi: npiSchema,
  firstName: required(80, "Le prénom"),
  lastName: required(80, "Le nom"),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const manualPayoutSchema = z.object({
  payoutId: z.string().min(1),
  providerReference: required(120, "La référence du virement"),
});
