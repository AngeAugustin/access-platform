"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, GraduationCap, IdCard, ListChecks, Lock, Mail, MapPin, Users } from "lucide-react";
import { registerAction } from "@/server/actions/auth";
import { fieldErrors, registerStepSchemas } from "@/lib/validation";
import { Button, cx } from "@/components/ui";
import {
  ActionForm,
  FieldError,
  FormErrorScope,
  FormMessage,
  SubmitButton,
  TextField,
  useFormState,
} from "@/components/ui/form";
import { PowGuard } from "@/components/security/pow-guard";
import { AuthHeading } from "@/components/auth/auth-heading";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { useSyncAuthRole } from "@/components/auth/auth-panel";

const roles = [
  { value: "PARENT", title: "Je suis parent", text: "Je cherche un éducateur pour mon enfant, du CI à la Terminale.", icon: Users },
  { value: "EDUCATOR", title: "Je suis éducateur", text: "Je donne des cours à domicile et je veux de nouveaux élèves.", icon: GraduationCap },
  { value: "TUTOR", title: "Je suis tuteur", text: "Je veille, pour les parents, aux leçons, aux devoirs et aux notes des enfants.", icon: ListChecks },
] as const;

const STEPS = [
  { label: "Profil", title: "Créer un compte", hint: "Gratuit, en trois courtes étapes.", fields: ["role"] },
  {
    label: "Identité",
    title: "Qui êtes-vous ?",
    hint: "Ces informations restent entre vous et Access.",
    fields: ["firstName", "lastName", "npi", "phone", "email", "city", "address"],
  },
  { label: "Accès", title: "Dernière étape", hint: "Un mot de passe, et votre compte est prêt.", fields: ["password", "confirmPassword", "acceptTerms"] },
] as const;

type StepIndex = 0 | 1 | 2;
type Role = (typeof roles)[number]["value"];

// Boutons de l'assistant : plus arrondis, comme les champs des pages de connexion.
const wizardButton = "rounded-2xl!";

export function RegisterForm({ defaultRole }: { defaultRole: Role }) {
  return (
    <ActionForm action={registerAction}>
      <PowGuard purpose="register" />
      <RegisterWizard defaultRole={defaultRole} />
    </ActionForm>
  );
}

function RegisterWizard({ defaultRole }: { defaultRole: Role }) {
  const { state, pending } = useFormState();
  const [step, setStep] = useState<StepIndex>(0);
  const [role, setRole] = useState<Role>(defaultRole);
  const [localErrors, setLocalErrors] = useState<NonNullable<typeof state.errors>>({});
  const [seenState, setSeenState] = useState(state);
  useSyncAuthRole(role);

  // La réponse du serveur peut signaler une erreur sur une étape précédente : on y revient
  // au rendu, sans effet, pour que le message s'affiche sur le bon écran.
  if (state !== seenState) {
    setSeenState(state);
    const errors = state.errors;
    if (errors) {
      const idx = STEPS.findIndex((s) => s.fields.some((f) => errors[f]?.length));
      if (idx === 0 || idx === 1 || idx === 2) setStep(idx);
    }
  }

  function goTo(next: StepIndex) {
    setLocalErrors({});
    setStep(next);
  }

  function goNext(form: HTMLFormElement | null) {
    if (!form) return;
    const parsed = registerStepSchemas[step].safeParse(Object.fromEntries(new FormData(form)));
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
      <Stepper step={step} onBack={goTo} />
      <div aria-live="polite">
        <AuthHeading title={STEPS[step].title} subtitle={STEPS[step].hint} />
      </div>
      <div className="space-y-5">
        <FormMessage />
        <div
          onKeyDown={(e) => {
            if (e.key !== "Enter" || step === 2) return;
            if (e.target instanceof HTMLElement && e.target.closest("textarea, a, button")) return;
            e.preventDefault();
            goNext(e.currentTarget.closest("form"));
          }}
        >
          <div hidden={step !== 0} className={step === 0 ? "animate-fade-in" : undefined}>
            <fieldset>
              <legend className="sr-only">Je m&apos;inscris en tant que</legend>
              <div className="space-y-3">
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className="group flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-slate-200 p-4 transition hover:border-slate-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/70 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-100 sm:p-5"
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      defaultChecked={r.value === defaultRole}
                      onChange={() => setRole(r.value)}
                      className="peer sr-only"
                    />
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 transition group-has-[:checked]:bg-brand-600 group-has-[:checked]:text-white sm:size-14">
                      <r.icon className="size-6" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold text-ink">{r.title}</span>
                      <span className="block text-sm text-slate-500">{r.text}</span>
                    </span>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-white transition group-has-[:checked]:border-brand-600 group-has-[:checked]:bg-brand-600">
                      <Check className="size-3.5 opacity-0 group-has-[:checked]:opacity-100" strokeWidth={3} aria-hidden />
                    </span>
                  </label>
                ))}
              </div>
              <FieldError name="role" />
            </fieldset>
          </div>
          <div hidden={step !== 1} className={step === 1 ? "animate-fade-in" : undefined}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Prénom" name="firstName" autoComplete="given-name" required />
              <TextField label="Nom" name="lastName" autoComplete="family-name" required />
              <TextField label="Téléphone" name="phone" type="tel" autoComplete="tel" required prefix="+229" placeholder="01 97 00 00 00" className="sm:col-span-2" />
              <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required icon={Mail} placeholder="vous@exemple.com" className="sm:col-span-2" />
              <TextField
                label="NPI"
                name="npi"
                inputMode="numeric"
                maxLength={10}
                required
                icon={IdCard}
                placeholder="10 chiffres"
                hint="Numéro personnel d'identification, sur votre CIP ou votre carte d'identité."
                className="sm:col-span-2"
              />
              <TextField label="Ville" name="city" autoComplete="address-level2" icon={MapPin} placeholder="Cotonou" />
              <TextField label="Quartier ou adresse" name="address" autoComplete="street-address" placeholder="Fidjrossè" />
            </div>
          </div>
          <div hidden={step !== 2} className={step === 2 ? "animate-fade-in" : undefined}>
            <NewPasswordFields icon={Lock} />
            <div className="mt-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-canvas p-4 text-sm text-slate-600">
                <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 shrink-0 accent-brand-600" />
                <span>
                  J&apos;accepte les{" "}
                  <Link href="/conditions" target="_blank" className="font-semibold text-brand-600 underline underline-offset-2">
                    conditions d&apos;utilisation
                  </Link>{" "}
                  et la{" "}
                  <Link href="/confidentialite" target="_blank" className="font-semibold text-brand-600 underline underline-offset-2">
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              <FieldError name="acceptTerms" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-3">
          {step > 0 && (
            <Button type="button" variant="secondary" size="lg" className={wizardButton} disabled={pending} onClick={() => goTo((step - 1) as StepIndex)}>
              <ChevronLeft aria-hidden />
              Retour
            </Button>
          )}
          {step < 2 ? (
            <Button type="button" size="lg" className={cx("flex-1", wizardButton)} onClick={(e) => goNext(e.currentTarget.form)}>
              Continuer
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <SubmitButton variant="accent" className={cx("flex-1", wizardButton)} size="lg" pendingLabel="Création du compte…">
              Créer mon compte
            </SubmitButton>
          )}
        </div>
        {step === 2 && (
          <p className="text-center text-xs text-slate-400">Les comptes administrateurs sont créés uniquement par l&apos;équipe Access.</p>
        )}
      </div>
    </FormErrorScope>
  );
}

function Stepper({ step, onBack }: { step: StepIndex; onBack: (i: StepIndex) => void }) {
  return (
    <nav aria-label="Progression de l'inscription" className="mb-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const current = i === step;
          const done = i < step;
          const label = (
            <span className="flex items-center gap-2">
              <span
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition",
                  done && "bg-brand-600 text-white",
                  current && "bg-brand-600 text-white ring-4 ring-brand-100",
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
              {done ? (
                <button type="button" onClick={() => onBack(i as StepIndex)} className="rounded-full transition hover:opacity-80">
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
