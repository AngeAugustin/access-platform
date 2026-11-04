import { REQUIRED_DOCUMENTS } from "@/lib/constants";

// Dossier éducateur : cinq étapes, enregistrées une à une.
export const DOSSIER_STEPS = [
  { key: "profil", label: "Profil", title: "Votre profil", hint: "Ce que les familles découvrent en premier." },
  { key: "parcours", label: "Parcours", title: "Votre parcours", hint: "Diplôme, situation actuelle et expériences d'enseignement." },
  { key: "cours", label: "Cours", title: "Vos cours", hint: "Matières, classes et créneaux où vous êtes disponible." },
  { key: "garants", label: "Garants", title: "Garants et paiements", hint: "Deux personnes de confiance et votre numéro Mobile Money." },
  { key: "pieces", label: "Pièces", title: "Pièces justificatives", hint: "Dernière étape avant de transmettre votre dossier." },
] as const;

export type DossierStepKey = (typeof DOSSIER_STEPS)[number]["key"];

export type Experience = { place: string; role: string; from: number; to?: number };

export function readExperiences(value: unknown): Experience[] {
  return Array.isArray(value) ? (value as Experience[]) : [];
}

type DossierFields = {
  birthDate: Date | null;
  maritalStatus: string | null;
  zone: string | null;
  degreeLevel: string | null;
  degreeField: string | null;
  occupation: string | null;
  experienceYears: number | null;
  subjects: string[];
  cycles: string[];
  classLevels: string[];
  availabilityCount: number;
  guarantor1Name: string | null;
  guarantor2Name: string | null;
  payoutPhone: string | null;
  documentTypes: string[];
};

// Étapes complètes, dans l'ordre de DOSSIER_STEPS.
export function dossierProgress(p: DossierFields): Record<DossierStepKey, boolean> {
  return {
    profil: Boolean(p.birthDate && p.maritalStatus && p.zone),
    parcours: Boolean(p.degreeLevel && p.degreeField && p.occupation && p.experienceYears !== null),
    cours: p.cycles.length > 0 && p.subjects.length > 0 && p.classLevels.length > 0 && p.availabilityCount > 0,
    garants: Boolean(p.guarantor1Name && p.guarantor2Name && p.payoutPhone),
    pieces: REQUIRED_DOCUMENTS.every((t) => p.documentTypes.includes(t)),
  };
}
