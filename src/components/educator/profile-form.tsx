"use client";

import { CLASS_LEVELS, MAX_AVAILABILITIES, SUBJECTS, TIME_SLOTS, WEEKDAYS } from "@/lib/constants";
import { saveEducatorProfileAction, submitProfileAction } from "@/server/actions/educator";
import { ActionForm, FieldError, FormMessage, SubmitButton, TextArea, TextField } from "@/components/ui/form";

export type EducatorDefaults = {
  birthDate?: string;
  maritalStatus?: string;
  experienceYears?: number;
  background?: string;
  bio?: string;
  zone?: string;
  subjects: string[];
  classLevels: string[];
  guarantor1Name?: string;
  guarantor1Address?: string;
  guarantor1Phone?: string;
  guarantor2Name?: string;
  guarantor2Address?: string;
  guarantor2Phone?: string;
  payoutPhone?: string;
  availabilities: string[];
  booked: string[];
};

function CheckGroup({ name, options, selected, columns = "sm:grid-cols-3" }: { name: string; options: [string, string][]; selected: string[]; columns?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${columns}`}>
      {options.map(([value, label]) => (
        <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} />
          {label}
        </label>
      ))}
    </div>
  );
}

export function EducatorProfileForm({ defaults }: { defaults: EducatorDefaults }) {
  const days = Object.entries(WEEKDAYS);
  const slots = Object.entries(TIME_SLOTS);
  return (
    <ActionForm action={saveEducatorProfileAction} className="space-y-6">
      <FormMessage />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Situation</legend>
        <TextField label="Date de naissance" name="birthDate" type="date" defaultValue={defaults.birthDate} required />
        <TextField label="Situation matrimoniale" name="maritalStatus" defaultValue={defaults.maritalStatus} required />
        <TextField label="Années d'expérience" name="experienceYears" type="number" min={0} max={60} defaultValue={defaults.experienceYears} required />
        <TextField label="Zone d'intervention" name="zone" defaultValue={defaults.zone} required placeholder="Cotonou, Akpakpa" />
        <TextArea label="Parcours" name="background" defaultValue={defaults.background} required className="sm:col-span-2" hint="Formation, établissements où vous avez enseigné, résultats obtenus." />
        <TextArea label="Présentation aux familles" name="bio" defaultValue={defaults.bio} rows={3} className="sm:col-span-2" />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-base font-semibold">Matières enseignées</legend>
        <CheckGroup name="subjects" options={Object.entries(SUBJECTS)} selected={defaults.subjects} />
        <FieldError name="subjects" />
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-base font-semibold">Classes</legend>
        <CheckGroup name="classLevels" options={CLASS_LEVELS.map((c) => [c, c])} selected={defaults.classLevels} columns="sm:grid-cols-4" />
        <FieldError name="classLevels" />
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-base font-semibold">Disponibilités</legend>
        <p className="mb-2 text-sm text-slate-600">Jusqu&apos;à {MAX_AVAILABILITIES} créneaux de 3 heures. Un créneau réservé par une famille ne peut pas être retiré.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr>
                <th />
                {days.map(([d, label]) => (
                  <th key={d} className="p-1 font-medium text-slate-600">
                    {label.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(([s, label]) => (
                <tr key={s}>
                  <th className="whitespace-nowrap p-1 text-left font-medium text-slate-600">{label}</th>
                  {days.map(([d]) => {
                    const value = `${d}|${s}`;
                    const booked = defaults.booked.includes(value);
                    return (
                      <td key={d} className="p-1">
                        <label className="flex cursor-pointer justify-center rounded border border-slate-200 py-2 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                          <input type="checkbox" name="availabilities" value={value} defaultChecked={defaults.availabilities.includes(value)} aria-label={`${d} ${label}`} />
                          {booked && <span className="ml-1 text-[10px] text-slate-500">réservé</span>}
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FieldError name="availabilities" />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-base font-semibold">Garants</legend>
        <TextField label="Garant 1 — nom" name="guarantor1Name" defaultValue={defaults.guarantor1Name} required />
        <TextField label="Adresse" name="guarantor1Address" defaultValue={defaults.guarantor1Address} required />
        <TextField label="Téléphone" name="guarantor1Phone" type="tel" defaultValue={defaults.guarantor1Phone} required />
        <TextField label="Garant 2 — nom" name="guarantor2Name" defaultValue={defaults.guarantor2Name} required />
        <TextField label="Adresse" name="guarantor2Address" id="guarantor2Address" defaultValue={defaults.guarantor2Address} required />
        <TextField label="Téléphone" name="guarantor2Phone" id="guarantor2Phone" type="tel" defaultValue={defaults.guarantor2Phone} required />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Reversements</legend>
        <TextField label="Numéro Mobile Money" name="payoutPhone" type="tel" defaultValue={defaults.payoutPhone} required hint="Numéro MTN ou Moov sur lequel Access vous reverse vos gains." />
      </fieldset>
      <SubmitButton>Enregistrer le dossier</SubmitButton>
    </ActionForm>
  );
}

export function SubmitProfileButton() {
  return (
    <ActionForm action={submitProfileAction} className="space-y-3" confirmMessage="Transmettre votre dossier à Access pour vérification ?">
      <FormMessage />
      <SubmitButton>Transmettre mon dossier pour validation</SubmitButton>
    </ActionForm>
  );
}
