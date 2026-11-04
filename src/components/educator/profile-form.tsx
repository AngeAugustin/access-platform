"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { CYCLES, DEGREE_LEVELS, MARITAL_STATUSES, MAX_AVAILABILITIES, MAX_EXPERIENCES, MOBILE_OPERATORS, OCCUPATIONS, TIME_SLOTS, WEEKDAYS } from "@/lib/constants";
import { type Curriculum, activeClassesOfCycle, activeSubjects } from "@/lib/curriculum";
import { DOSSIER_STEPS, type DossierStepKey, type Experience } from "@/lib/educator-dossier";
import { ZONES } from "@/lib/zones";
import { saveDossierStepAction, submitProfileAction } from "@/server/actions/educator";
import { buttonClass } from "@/components/ui";
import { ActionForm, FieldError, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/ui/form";
import { TagInput } from "@/components/ui/tag-input";

export type EducatorDefaults = {
  birthDate?: string;
  maritalStatus?: string;
  zone?: string;
  bio?: string;
  degreeLevel?: string;
  degreeField?: string;
  degreeSchool?: string;
  degreeYear?: number;
  occupation?: string;
  occupationPlace?: string;
  experienceYears?: number;
  experiences: Experience[];
  achievements?: string;
  // Texte libre d'un ancien dossier, montré pour aider à remplir le parcours détaillé.
  background?: string;
  subjects: string[];
  cycles: string[];
  classLevels: string[];
  guarantor1Name?: string;
  guarantor1Address?: string;
  guarantor1Phone?: string;
  guarantor2Name?: string;
  guarantor2Address?: string;
  guarantor2Phone?: string;
  payoutPhone?: string;
  payoutOperator?: string;
  availabilities: string[];
  booked: string[];
};

const options = (values: readonly string[]) => values.map((v) => [v, v] as const);

// Formulaire d'une étape : « Enregistrer et continuer » sauvegarde puis ouvre l'étape suivante.
function StepForm({ step, children }: { step: DossierStepKey; children: ReactNode }) {
  const index = DOSSIER_STEPS.findIndex((s) => s.key === step);
  const previous = DOSSIER_STEPS[index - 1];
  return (
    <ActionForm action={saveDossierStepAction} className="space-y-6">
      <input type="hidden" name="step" value={step} />
      <FormMessage />
      {children}
      <div className="flex gap-3 border-t border-slate-100 pt-6">
        {previous && (
          <Link href={`?etape=${previous.key}`} className={buttonClass("secondary", undefined, "lg")}>
            <ChevronLeft aria-hidden /> Retour
          </Link>
        )}
        <SubmitButton size="lg" className="ml-auto" pendingLabel="Enregistrement…">
          Enregistrer et continuer <ArrowRight aria-hidden />
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function CheckGroup({ name, options, selected, columns = "sm:grid-cols-3" }: { name: string; options: [string, string][]; selected: string[]; columns?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${columns}`}>
      {options.map(([value, label]) => (
        <label key={value} className="choice">
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} />
          {label}
        </label>
      ))}
    </div>
  );
}

function Section({ title, hint, children, className = "grid grid-cols-1 gap-4 sm:grid-cols-2" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="col-span-full mb-1 text-15px font-semibold text-ink">{title}</legend>
      {hint && <p className="col-span-full -mt-2 text-sm text-slate-500">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function ProfileStep({ defaults }: { defaults: EducatorDefaults }) {
  return (
    <StepForm step="profil">
      <Section title="Situation">
        <TextField label="Date de naissance" name="birthDate" type="date" defaultValue={defaults.birthDate} required />
        <SelectField label="Situation matrimoniale" name="maritalStatus" defaultValue={defaults.maritalStatus ?? ""} required placeholder="Choisir…" options={options(MARITAL_STATUSES)} />
        <div className="sm:col-span-2">
          <TagInput
            label="Zones d'intervention"
            name="zone"
            options={ZONES}
            defaultValue={defaults.zone}
            required
            placeholder="Tapez un quartier ou une commune…"
            hint="Choisissez autant de zones que vous voulez : les familles de ces quartiers vous trouveront."
          />
        </div>
      </Section>
      <TextArea
        label="Présentation aux familles"
        name="bio"
        defaultValue={defaults.bio}
        rows={4}
        hint="Quelques phrases sur votre façon d'enseigner. Facultatif, mais les familles la lisent avant de choisir."
      />
    </StepForm>
  );
}

type ExperienceRow = { place: string; role: string; from: string; to: string };

// Liste d'expériences modifiable, envoyée en JSON dans un champ caché.
function ExperiencesField({ defaultValue }: { defaultValue: Experience[] }) {
  const [rows, setRows] = useState<ExperienceRow[]>(() =>
    defaultValue.map((e) => ({ place: e.place, role: e.role, from: String(e.from), to: e.to ? String(e.to) : "" })),
  );
  const update = (i: number, key: keyof ExperienceRow, value: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  return (
    <div className="col-span-full space-y-3">
      <input type="hidden" name="experiences" value={JSON.stringify(rows)} />
      {rows.map((row, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Expérience {i + 1}</p>
            <button
              type="button"
              onClick={() => setRows((r) => r.filter((_, j) => j !== i))}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-13px font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="size-3.5" aria-hidden /> Retirer
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_6rem_6rem]">
            <label className="col-span-2 sm:col-span-1">
              <span className="label">Établissement ou cadre</span>
              <input className="field" value={row.place} onChange={(e) => update(i, "place", e.target.value)} placeholder="CEG Gbégamey, cours à domicile…" />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="label">Poste</span>
              <input className="field" value={row.role} onChange={(e) => update(i, "role", e.target.value)} placeholder="Professeur de mathématiques" />
            </label>
            <label>
              <span className="label">De</span>
              <input className="field" inputMode="numeric" maxLength={4} value={row.from} onChange={(e) => update(i, "from", e.target.value)} placeholder="2019" />
            </label>
            <label>
              <span className="label">À</span>
              <input className="field" inputMode="numeric" maxLength={4} value={row.to} onChange={(e) => update(i, "to", e.target.value)} placeholder="En cours" />
            </label>
          </div>
        </div>
      ))}
      {rows.length < MAX_EXPERIENCES && (
        <button
          type="button"
          onClick={() => setRows((r) => [...r, { place: "", role: "", from: "", to: "" }])}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3.5 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50/50"
        >
          <Plus className="size-4" aria-hidden /> Ajouter une expérience
        </button>
      )}
      <FieldError name="experiences" />
    </div>
  );
}

export function BackgroundStep({ defaults }: { defaults: EducatorDefaults }) {
  return (
    <StepForm step="parcours">
      {defaults.background && !defaults.degreeLevel && (
        <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
          <p className="font-semibold text-ink">Votre parcours actuel</p>
          <p className="mt-1 whitespace-pre-line">{defaults.background}</p>
          <p className="mt-2 text-13px text-slate-500">Reportez ces informations dans les champs ci-dessous.</p>
        </div>
      )}
      <Section title="Diplôme le plus élevé">
        <SelectField label="Diplôme" name="degreeLevel" defaultValue={defaults.degreeLevel ?? ""} required placeholder="Choisir…" options={options(DEGREE_LEVELS)} />
        <TextField label="Filière ou spécialité" name="degreeField" defaultValue={defaults.degreeField} required placeholder="Mathématiques" />
        <TextField label="Établissement" name="degreeSchool" defaultValue={defaults.degreeSchool} placeholder="Université d'Abomey-Calavi" />
        <TextField label="Année d'obtention" name="degreeYear" inputMode="numeric" maxLength={4} defaultValue={defaults.degreeYear} placeholder="2020" />
      </Section>
      <Section title="Situation actuelle">
        <SelectField label="Vous êtes" name="occupation" defaultValue={defaults.occupation ?? ""} required placeholder="Choisir…" options={options(OCCUPATIONS)} />
        <TextField label="Établissement ou employeur" name="occupationPlace" defaultValue={defaults.occupationPlace} placeholder="Lycée Béhanzin, FAST…" />
        <TextField label="Années d'expérience en enseignement" name="experienceYears" type="number" min={0} max={60} defaultValue={defaults.experienceYears} required />
      </Section>
      <Section title="Expériences d'enseignement" hint="Écoles, centres, cours à domicile : du plus récent au plus ancien. Laissez « À » vide pour une expérience en cours.">
        <ExperiencesField defaultValue={defaults.experiences} />
      </Section>
      <TextArea
        label="Résultats et références"
        name="achievements"
        defaultValue={defaults.achievements}
        rows={3}
        hint="Facultatif : taux de réussite au BEPC ou au BAC, nombre d'élèves suivis, distinctions."
      />
    </StepForm>
  );
}

export function CoursesStep({ curriculum, defaults }: { curriculum: Curriculum; defaults: EducatorDefaults }) {
  const days = Object.entries(WEEKDAYS);
  const slots = Object.entries(TIME_SLOTS);
  // Les classes proposées suivent les cycles cochés.
  const [cycles, setCycles] = useState<string[]>(defaults.cycles);
  // Matières évaluées dans les classes de chaque cycle ; une matière commune à plusieurs cycles
  // (le français, par exemple) apparaît dans chacun, cochée partout à la fois.
  const subjectsOfCycle = (cycle: string) => {
    const taught = new Set(curriculum.classes.filter((c) => c.active && c.cycle === cycle).flatMap((c) => c.subjects));
    return activeSubjects(curriculum).filter((s) => taught.has(s.key));
  };
  const shownSubjects = new Set(cycles.flatMap((c) => subjectsOfCycle(c).map((s) => s.key)));
  const [subjects, setSubjects] = useState(() => new Set(defaults.subjects));
  const toggleSubject = (key: string, on: boolean) =>
    setSubjects((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const toggle = (cycle: string, on: boolean) => setCycles((c) => (on ? CYCLES.filter((x) => x === cycle || c.includes(x)) : c.filter((x) => x !== cycle)));
  return (
    <StepForm step="cours">
      <fieldset>
        <legend className="text-15px font-semibold text-ink">Cycles</legend>
        <p className="mt-1 mb-3 text-sm text-slate-500">Choisissez d&apos;abord les cycles où vous enseignez, puis vos classes.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CYCLES.map((c) => (
            <label key={c} className="choice">
              <input type="checkbox" name="cycles" value={c} checked={cycles.includes(c)} onChange={(e) => toggle(c, e.target.checked)} />
              {c}
            </label>
          ))}
        </div>
        <FieldError name="cycles" />
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-15px font-semibold text-ink">Classes</legend>
        {cycles.length === 0 ? (
          <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-slate-500">Cochez un cycle pour afficher ses classes.</p>
        ) : (
          <div className="space-y-4">
            {cycles.map((cycle) => (
              <div key={cycle}>
                <p className="mb-2 text-13px font-semibold tracking-[0.04em] text-slate-500 uppercase">{cycle}</p>
                <CheckGroup name="classLevels" options={activeClassesOfCycle(curriculum, cycle).map((c) => [c, c])} selected={defaults.classLevels} columns="sm:grid-cols-4" />
              </div>
            ))}
          </div>
        )}
        <FieldError name="classLevels" />
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-15px font-semibold text-ink">Matières enseignées</legend>
        {cycles.length === 0 ? (
          <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-slate-500">Cochez un cycle pour afficher ses matières.</p>
        ) : (
          <div className="space-y-4">
            {/* Seules les matières visibles sont envoyées : décocher un cycle retire ses matières. */}
            {[...subjects].filter((s) => shownSubjects.has(s)).map((s) => (
              <input key={s} type="hidden" name="subjects" value={s} />
            ))}
            {cycles.map((cycle) => (
              <div key={cycle}>
                <p className="mb-2 text-13px font-semibold tracking-[0.04em] text-slate-500 uppercase">{cycle}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subjectsOfCycle(cycle).map((s) => (
                    <label key={s.key} className="choice">
                      <input type="checkbox" checked={subjects.has(s.key)} onChange={(e) => toggleSubject(s.key, e.target.checked)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <FieldError name="subjects" />
      </fieldset>
      <fieldset>
        <legend className="text-15px font-semibold text-ink">Disponibilités</legend>
        <p className="mt-1 mb-3 text-sm text-slate-500">Jusqu&apos;à {MAX_AVAILABILITIES} créneaux de 3 heures. Un créneau réservé par une famille ne peut pas être retiré.</p>
        <div className="scroll-x -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[460px] border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr>
                <th className="w-16" />
                {days.map(([d, label]) => (
                  <th key={d} className="pb-1 font-medium text-slate-500">
                    {label.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(([s, label]) => (
                <tr key={s}>
                  <th className="pr-2 text-left font-medium whitespace-nowrap text-slate-500">{label}</th>
                  {days.map(([d]) => {
                    const value = `${d}|${s}`;
                    const booked = defaults.booked.includes(value);
                    return (
                      <td key={d}>
                        <label className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-slate-200 py-2 transition hover:border-slate-300 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50">
                          <input type="checkbox" name="availabilities" value={value} defaultChecked={defaults.availabilities.includes(value)} aria-label={`${d} ${label}`} className="size-4 accent-emerald-600" />
                          {booked && <span className="text-10px font-medium text-emerald-700">réservé</span>}
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
    </StepForm>
  );
}

export function GuarantorsStep({ defaults }: { defaults: EducatorDefaults }) {
  return (
    <StepForm step="garants">
      <Section title="Garant 1" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField label="Nom complet" name="guarantor1Name" defaultValue={defaults.guarantor1Name} required />
        <TextField label="Adresse" name="guarantor1Address" defaultValue={defaults.guarantor1Address} required />
        <TextField label="Téléphone" name="guarantor1Phone" type="tel" defaultValue={defaults.guarantor1Phone} required />
      </Section>
      <Section title="Garant 2" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField label="Nom complet" name="guarantor2Name" defaultValue={defaults.guarantor2Name} required />
        <TextField label="Adresse" name="guarantor2Address" defaultValue={defaults.guarantor2Address} required />
        <TextField label="Téléphone" name="guarantor2Phone" type="tel" defaultValue={defaults.guarantor2Phone} required />
      </Section>
      <Section title="Reversements" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Numéro Mobile Money" name="payoutPhone" type="tel" defaultValue={defaults.payoutPhone} required hint="Numéro sur lequel Access vous reverse vos gains." />
        <SelectField
          label="Opérateur"
          name="payoutOperator"
          options={Object.entries(MOBILE_OPERATORS)}
          placeholder="Choisir…"
          defaultValue={defaults.payoutOperator ?? ""}
          required
        />
      </Section>
    </StepForm>
  );
}

export function SubmitProfileButton() {
  return (
    <ActionForm action={submitProfileAction} className="space-y-3" confirm={{ title: "Transmettre votre dossier ?", description: "Access le vérifiera avant de vous proposer aux familles.", confirmLabel: "Transmettre" }}
    >
      <FormMessage />
      <SubmitButton className="w-full">Transmettre pour validation</SubmitButton>
    </ActionForm>
  );
}
