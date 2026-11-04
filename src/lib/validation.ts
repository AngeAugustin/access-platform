import { z } from "zod";
import { ZONES, parseZones } from "@/lib/zones";
import { COMPLAINT_SUBJECTS, CYCLES, DEGREE_LEVELS, MARITAL_STATUSES, MAX_AVAILABILITIES, MAX_EXPERIENCES, MOBILE_OPERATORS, OCCUPATIONS, SUBJECT_LEVELS, TIME_SLOTS, WEEKDAYS } from "@/lib/constants";

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

const registerFields = z.object({
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
});

const passwordsMatch = {
  path: ["confirmPassword"],
  error: "Les mots de passe ne correspondent pas.",
};

export const registerStepSchemas = [
  registerFields.pick({ role: true }),
  registerFields.pick({
    firstName: true,
    lastName: true,
    npi: true,
    phone: true,
    email: true,
    city: true,
    address: true,
  }),
  registerFields.pick({ password: true, confirmPassword: true, acceptTerms: true }).refine((d) => d.password === d.confirmPassword, passwordsMatch),
] as const;

export const registerSchema = registerFields.refine((d) => d.password === d.confirmPassword, passwordsMatch);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est obligatoire.").max(128),
  remember: z.literal("on").optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

const resetCode = z.string().trim().regex(/^\d{6}$/, "Le code comporte 6 chiffres.");

export const resetCodeSchema = z.object({ email: emailSchema, code: resetCode });

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    code: resetCode,
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

// Classes et matières vivent en base : le schéma ne contrôle que la forme, les actions vérifient
// l'appartenance au référentiel (voir src/lib/curriculum.ts).
const classLevel = z.string({ error: "Choisissez une classe." }).trim().min(1, "Choisissez une classe.").max(40, "Classe invalide.");
const subjectKey = z.string().trim().min(1).max(40);

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
  levels: z.record(subjectKey, z.enum(Object.keys(SUBJECT_LEVELS) as [keyof typeof SUBJECT_LEVELS])),
});

// Assistant d'inscription d'un enfant : contrôles faits dans le navigateur avant de passer à l'étape suivante.
export const childStepSchemas = [
  childSchema.pick({ firstName: true, lastName: true, sex: true, birthDate: true, npi: true }),
  childSchema
    .pick({ currentClass: true, currentSchool: true, previousClass: true, previousSchool: true })
    .extend({ cycle: z.enum(CYCLES, { error: "Choisissez le cycle." }) }),
] as const;

// ---------------------------------------------------------------------------
// Éducateurs
// ---------------------------------------------------------------------------

const weekday = z.enum(Object.keys(WEEKDAYS) as [keyof typeof WEEKDAYS]);
const timeSlot = z.enum(Object.keys(TIME_SLOTS) as [keyof typeof TIME_SLOTS]);

export const slotSchema = z.object({ day: weekday, slot: timeSlot });

// Dossier éducateur : un schéma par étape (voir src/lib/educator-dossier.ts).
const CURRENT_YEAR = new Date().getFullYear();
const year = (label: string) =>
  z.coerce
    .number({ error: `${label} invalide.` })
    .int(`${label} invalide.`)
    .min(1960, `${label} invalide.`)
    .max(CURRENT_YEAR, `${label} invalide.`);
const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

const experienceSchema = z
  .object({
    place: required(150, "L'établissement ou le cadre"),
    role: required(120, "Le poste"),
    from: year("L'année de début"),
    to: z.preprocess(blankToUndefined, year("L'année de fin").optional()),
  })
  .refine((e) => e.to === undefined || e.to >= e.from, { error: "L'année de fin précède l'année de début.", path: ["to"] });

export const dossierStepSchemas = {
  profil: z.object({
    birthDate: dateString("Date de naissance"),
    maritalStatus: z.enum(MARITAL_STATUSES, { error: "Choisissez votre situation matrimoniale." }),
    zone: required(2000, "La zone d'intervention").refine((v) => parseZones(v).every((z) => ZONES.includes(z)), "Choisissez vos zones dans la liste proposée."),
    bio: optional(1000),
  }),
  parcours: z.object({
    degreeLevel: z.enum(DEGREE_LEVELS, { error: "Choisissez votre diplôme le plus élevé." }),
    degreeField: required(120, "La filière"),
    degreeSchool: optional(150),
    degreeYear: z.preprocess(blankToUndefined, year("L'année d'obtention").optional()),
    occupation: z.enum(OCCUPATIONS, { error: "Choisissez votre situation actuelle." }),
    occupationPlace: optional(150),
    experienceYears: z.coerce.number().int().min(0, "Valeur invalide.").max(60, "Valeur invalide."),
    // Liste envoyée en JSON par le formulaire.
    experiences: z
      .string()
      .transform((v, ctx) => {
        try {
          return JSON.parse(v || "[]") as unknown;
        } catch {
          ctx.addIssue({ code: "custom", message: "Expériences invalides." });
          return z.NEVER;
        }
      })
      .pipe(z.array(experienceSchema).max(MAX_EXPERIENCES, `${MAX_EXPERIENCES} expériences maximum.`)),
    achievements: optional(1000),
  }),
  cours: z.object({
    cycles: z.array(z.enum(CYCLES)).min(1, "Choisissez au moins un cycle."),
    subjects: z.array(subjectKey).min(1, "Choisissez au moins une matière."),
    classLevels: z.array(classLevel).min(1, "Choisissez au moins une classe."),
    availabilities: z
      .array(slotSchema)
      .min(1, "Indiquez au moins une disponibilité.")
      .max(MAX_AVAILABILITIES, `${MAX_AVAILABILITIES} disponibilités maximum.`),
  }),
  garants: z.object({
    guarantor1Name: required(120, "Le garant 1"),
    guarantor1Address: required(200, "L'adresse du garant 1"),
    guarantor1Phone: phoneSchema,
    guarantor2Name: required(120, "Le garant 2"),
    guarantor2Address: required(200, "L'adresse du garant 2"),
    guarantor2Phone: phoneSchema,
    payoutPhone: phoneSchema,
    payoutOperator: z.enum(Object.keys(MOBILE_OPERATORS) as [keyof typeof MOBILE_OPERATORS], { error: "Choisissez l'opérateur de votre numéro." }),
  }),
};

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
  cycles: z.array(z.enum(CYCLES)).min(1, "Choisissez au moins un cycle."),
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

// Une case décochée n'envoie aucun champ.
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on");

export const classLevelSchema = z.object({
  id: z.string().optional(),
  name: required(40, "Le nom de la classe"),
  cycle: z.enum(CYCLES, { error: "Choisissez le cycle de la classe." }),
  active: checkbox,
  subjects: z.array(subjectKey),
});

export const subjectSchema = z.object({
  id: z.string().optional(),
  label: required(80, "Le nom de la matière"),
  active: checkbox,
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

export const resolveAnomalySchema = z.object({
  paymentId: z.string().min(1),
  note: required(500, "La note de traitement"),
});

export const refundDoneSchema = z.object({
  installmentId: z.string().min(1),
  note: required(500, "La note de traitement"),
});

// Formulaire de contact public (visiteurs non connectés).
export const contactSchema = z.object({
  name: required(120, "Le nom"),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(phoneSchema.optional()),
  profile: z.enum(["PARENT", "EDUCATOR", "OTHER"], { error: "Choisissez votre profil." }),
  subject: required(150, "L'objet"),
  message: text(3000).min(10, "Votre message est trop court."),
});
