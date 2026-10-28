"use client";

import { useState } from "react";
import { CLASS_LEVELS, SUBJECTS, SUBJECT_LEVELS, subjectsForClass } from "@/lib/constants";
import { saveChildAction } from "@/server/actions/parent";
import { ActionForm, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";

export type ChildDefaults = {
  id?: string;
  npi?: string;
  firstName?: string;
  lastName?: string;
  sex?: string;
  birthDate?: string;
  previousClass?: string;
  previousSchool?: string;
  currentClass?: string;
  currentSchool?: string;
  favoriteSubjects?: string;
  interests?: string;
  levels?: Record<string, string>;
};

const classOptions = CLASS_LEVELS.map((c) => [c, c] as const);
const levelOptions = Object.entries(SUBJECT_LEVELS) as [string, string][];

export function ChildForm({ defaults = {} }: { defaults?: ChildDefaults }) {
  const [currentClass, setCurrentClass] = useState(defaults.currentClass ?? "");
  const subjects = subjectsForClass(currentClass);

  return (
    <ActionForm action={saveChildAction} className="space-y-8">
      <FormMessage />
      {defaults.id && <input type="hidden" name="childId" value={defaults.id} />}
      <fieldset className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-8 sm:grid-cols-2">
        <legend className="col-span-full mb-1 text-[15px] font-semibold text-ink">Identité</legend>
        <TextField label="Prénom" name="firstName" defaultValue={defaults.firstName} required />
        <TextField label="Nom" name="lastName" defaultValue={defaults.lastName} required />
        <SelectField label="Sexe" name="sex" defaultValue={defaults.sex ?? ""} required placeholder="Choisir…" options={[["F", "Fille"], ["M", "Garçon"]]} />
        <TextField label="Date de naissance" name="birthDate" type="date" defaultValue={defaults.birthDate} required />
        <TextField label="NPI de l'enfant" name="npi" inputMode="numeric" maxLength={10} defaultValue={defaults.npi} hint="Facultatif." />
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-8 sm:grid-cols-2">
        <legend className="col-span-full mb-1 text-[15px] font-semibold text-ink">Scolarité</legend>
        <SelectField
          label="Classe actuelle"
          name="currentClass"
          required
          placeholder="Choisir…"
          options={classOptions}
          value={currentClass}
          onChange={(e) => setCurrentClass(e.target.value)}
        />
        <TextField label="École actuelle" name="currentSchool" defaultValue={defaults.currentSchool} />
        <TextField label="Classe précédente" name="previousClass" defaultValue={defaults.previousClass} />
        <TextField label="École précédente" name="previousSchool" defaultValue={defaults.previousSchool} />
        <TextArea label="Matières préférées" name="favoriteSubjects" rows={2} defaultValue={defaults.favoriteSubjects} />
        <TextArea label="Centres d'intérêt" name="interests" rows={2} defaultValue={defaults.interests} />
      </fieldset>
      {subjects.length > 0 && (
        <fieldset>
          <legend className="text-[15px] font-semibold text-ink">Niveau par matière</legend>
          <p className="mt-1 mb-4 text-sm text-slate-500">Ces informations aident l&apos;éducateur à préparer ses séances.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <SelectField key={s} label={SUBJECTS[s]} name={`level_${s}`} required placeholder="Choisir…" options={levelOptions} defaultValue={defaults.levels?.[s] ?? ""} />
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex justify-end border-t border-slate-100 pt-6">
        <SubmitButton size="lg">{defaults.id ? "Enregistrer les modifications" : "Inscrire l'enfant"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
