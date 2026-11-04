"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { CYCLES, SUBJECT_LEVELS } from "@/lib/constants";
import { type Curriculum, activeClassesOfCycle, activeSubjects, cycleOfClass, subjectLabel, subjectsForClass } from "@/lib/curriculum";
import { childStepSchemas, fieldErrors } from "@/lib/validation";
import { saveChildAction } from "@/server/actions/parent";
import { Button, cx } from "@/components/ui";
import { ActionForm, FormErrorScope, FormMessage, SelectField, SubmitButton, TextArea, TextField, useFormState } from "@/components/ui/form";
import { TagInput } from "@/components/ui/tag-input";

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

const levelOptions = Object.entries(SUBJECT_LEVELS) as [string, string][];

const STEPS = [
  { label: "Identité", title: "Qui est votre enfant ?", hint: "Son état civil, tel qu'il figure sur ses papiers.", fields: ["firstName", "lastName", "sex", "birthDate", "npi"] },
  { label: "Scolarité", title: "Sa scolarité", hint: "Le cycle puis la classe actuelle, qui fixe le tarif et les matières suivies.", fields: ["cycle", "currentClass", "currentSchool", "previousClass", "previousSchool"] },
  { label: "Niveaux", title: "Son niveau et ses goûts", hint: "Ces informations aident l'éducateur à préparer ses séances.", fields: [] },
] as const;

type StepIndex = 0 | 1 | 2;

export function ChildForm({ curriculum, defaults = {} }: { curriculum: Curriculum; defaults?: ChildDefaults }) {
  return (
    <ActionForm
      action={saveChildAction}
      confirm={defaults.id ? { title: "Enregistrer les modifications ?", description: "La fiche de l'enfant sera mise à jour.", confirmLabel: "Enregistrer" } : undefined}
    >
      {defaults.id && <input type="hidden" name="childId" value={defaults.id} />}
      <ChildWizard curriculum={curriculum} defaults={defaults} />
    </ActionForm>
  );
}

function ChildWizard({ curriculum, defaults }: { curriculum: Curriculum; defaults: ChildDefaults }) {
  const { state } = useFormState();
  const editing = Boolean(defaults.id);
  const [step, setStep] = useState<StepIndex>(0);
  const [localErrors, setLocalErrors] = useState<NonNullable<typeof state.errors>>({});
  const [currentClass, setCurrentClass] = useState(defaults.currentClass ?? "");
  const [cycle, setCycle] = useState(cycleOfClass(curriculum, defaults.currentClass ?? "") ?? "");

  // Erreur renvoyée par le serveur : on rouvre l'étape du premier champ en cause.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    const errors = state.errors ?? {};
    const idx = STEPS.findIndex((s) => s.fields.some((f) => errors[f]?.length));
    if (idx === 0 || idx === 1) setStep(idx);
    else if (state.ok === false) setStep(2);
  }

  const subjects = subjectsForClass(curriculum, currentClass);
  // La classe actuelle reste proposée même si elle a été désactivée depuis l'inscription.
  const classes = cycle ? activeClassesOfCycle(curriculum, cycle) : [];
  if (defaults.currentClass && cycleOfClass(curriculum, defaults.currentClass) === cycle && !classes.includes(defaults.currentClass)) classes.push(defaults.currentClass);
  const classOptions = classes.map((c) => [c, c] as const);
  // Matières suggérées : celles de la classe choisie d'abord, puis les autres matières du même cycle.
  const cycleSubjects = new Set(classes.flatMap((c) => subjectsForClass(curriculum, c)));
  const subjectOptions = [
    ...subjects.map((s) => subjectLabel(curriculum, s)),
    ...activeSubjects(curriculum)
      .filter((s) => cycleSubjects.has(s.key) && !subjects.includes(s.key))
      .map((s) => s.label),
  ];

  function goTo(next: StepIndex) {
    setLocalErrors({});
    setStep(next);
  }

  function goNext(form: HTMLFormElement | null) {
    if (!form || step === 2) return;
    const parsed = childStepSchemas[step].safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const errors = fieldErrors(parsed.error).errors ?? {};
      setLocalErrors(errors);
      const first = Object.keys(errors)[0];
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    goTo((step + 1) as StepIndex);
  }

  return (
    <FormErrorScope errors={localErrors}>
      <Stepper step={step} onSelect={goTo} free={editing} />
      <div aria-live="polite" className="mb-6">
        <p className="text-13px font-semibold tracking-[0.06em] text-brand-600 uppercase">
          Étape {step + 1} sur {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">{STEPS[step].title}</h2>
        <p className="mt-1 text-sm text-slate-500">{STEPS[step].hint}</p>
      </div>
      <div className="space-y-6">
        <FormMessage />
        <div
          onKeyDown={(e) => {
            // Entrée passe à l'étape suivante au lieu d'envoyer le formulaire.
            if (e.key !== "Enter" || step === 2) return;
            if (e.target instanceof HTMLElement && e.target.closest("textarea, a, button, [role=combobox]")) return;
            e.preventDefault();
            goNext(e.currentTarget.closest("form"));
          }}
        >
          <div hidden={step !== 0} className={cx("grid grid-cols-1 gap-4 sm:grid-cols-2", step === 0 && "animate-fade-in")}>
            <TextField label="Prénom" name="firstName" defaultValue={defaults.firstName} required />
            <TextField label="Nom" name="lastName" defaultValue={defaults.lastName} required />
            <SelectField label="Sexe" name="sex" defaultValue={defaults.sex ?? ""} required placeholder="Choisir…" options={[["F", "Fille"], ["M", "Garçon"]]} />
            <TextField label="Date de naissance" name="birthDate" type="date" defaultValue={defaults.birthDate} required />
            <TextField label="NPI de l'enfant" name="npi" inputMode="numeric" maxLength={10} defaultValue={defaults.npi} hint="Facultatif." className="sm:col-span-2" />
          </div>
          <div hidden={step !== 1} className={cx("grid grid-cols-1 gap-4 sm:grid-cols-2", step === 1 && "animate-fade-in")}>
            <SelectField
              label="Cycle"
              name="cycle"
              required
              placeholder="Choisir…"
              options={CYCLES.map((c) => [c, c] as const)}
              value={cycle}
              onChange={(e) => {
                // Changer de cycle vide la classe si elle n'en fait pas partie.
                setCycle(e.target.value);
                if (cycleOfClass(curriculum, currentClass) !== e.target.value) setCurrentClass("");
              }}
            />
            <SelectField
              label="Classe actuelle"
              name="currentClass"
              required
              disabled={!cycle}
              placeholder={cycle ? "Choisir…" : "Choisissez d'abord le cycle"}
              options={classOptions}
              value={currentClass}
              onChange={(e) => setCurrentClass(e.target.value)}
            />
            <TextField label="École actuelle" name="currentSchool" defaultValue={defaults.currentSchool} className="sm:col-span-2" />
            <TextField label="Classe précédente" name="previousClass" defaultValue={defaults.previousClass} />
            <TextField label="École précédente" name="previousSchool" defaultValue={defaults.previousSchool} />
          </div>
          <div hidden={step !== 2} className={cx("space-y-6", step === 2 && "animate-fade-in")}>
            {subjects.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-15px font-semibold text-ink">Niveau par matière en {currentClass}</legend>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((s) => (
                    <SelectField key={s} label={subjectLabel(curriculum, s)} name={`level_${s}`} required placeholder="Choisir…" options={levelOptions} defaultValue={defaults.levels?.[s] ?? ""} />
                  ))}
                </div>
              </fieldset>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TagInput label="Matières préférées" name="favoriteSubjects" options={subjectOptions} defaultValue={defaults.favoriteSubjects} placeholder="Tapez une matière…" />
              <TextArea label="Centres d'intérêt" name="interests" rows={2} defaultValue={defaults.interests} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 pt-6">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" onClick={() => goTo((step - 1) as StepIndex)}>
              <ChevronLeft aria-hidden /> Retour
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" size="lg" className="ml-auto" onClick={(e) => goNext(e.currentTarget.form)}>
              Continuer <ArrowRight aria-hidden />
            </Button>
          ) : (
            <SubmitButton size="lg" className="ml-auto" pendingLabel="Enregistrement…">
              {editing ? "Enregistrer les modifications" : "Inscrire l'enfant"}
            </SubmitButton>
          )}
        </div>
      </div>
    </FormErrorScope>
  );
}

// En création, on n'avance qu'en validant chaque étape ; en modification, toutes les étapes sont ouvertes.
function Stepper({ step, onSelect, free }: { step: StepIndex; onSelect: (i: StepIndex) => void; free: boolean }) {
  return (
    <nav aria-label="Étapes de l'inscription" className="mb-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const current = i === step;
          const done = i < step;
          const clickable = !current && (done || free);
          const label = (
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition",
                  current && "bg-brand-600 text-white ring-4 ring-brand-100",
                  done && "bg-brand-600 text-white",
                  !current && !done && "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cx("text-sm font-semibold", current || done ? "text-ink" : "text-slate-400", !current && "max-sm:sr-only")}>{s.label}</span>
            </span>
          );
          return (
            <li key={s.label} className={cx("flex items-center gap-2", i < STEPS.length - 1 && "flex-1")}>
              {clickable ? (
                <button type="button" onClick={() => onSelect(i as StepIndex)} className="rounded-full transition hover:opacity-80">
                  {label}
                </button>
              ) : (
                <span aria-current={current ? "step" : undefined}>{label}</span>
              )}
              {i < STEPS.length - 1 && <span className={cx("mx-1 h-0.5 flex-1 rounded-full transition-colors", done ? "bg-brand-600" : "bg-slate-200")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
