"use client";

import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";
import { registerAction } from "@/server/actions/auth";
import { ActionForm, FieldError, FormMessage, SubmitButton, TextField } from "@/components/ui/form";
import { PowGuard } from "@/components/security/pow-guard";

const roles = [
  { value: "PARENT", title: "Parent", text: "Je cherche un éducateur", icon: Users },
  { value: "EDUCATOR", title: "Éducateur", text: "Je propose mes cours", icon: GraduationCap },
] as const;

export function RegisterForm({ defaultRole }: { defaultRole: "PARENT" | "EDUCATOR" }) {
  return (
    <ActionForm action={registerAction} className="space-y-5">
      <FormMessage />
      <PowGuard purpose="register" />
      <fieldset>
        <legend className="label">Je m&apos;inscris en tant que</legend>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <label
              key={r.value}
              className="relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60 has-[:checked]:ring-4 has-[:checked]:ring-brand-100"
            >
              <input type="radio" name="role" value={r.value} defaultChecked={r.value === defaultRole} className="peer sr-only" />
              <r.icon className="size-5 text-slate-400 peer-checked:text-brand-600" strokeWidth={1.8} aria-hidden />
              <span>
                <span className="block text-sm font-semibold text-ink">{r.title}</span>
                <span className="block text-xs text-slate-500">{r.text}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError name="role" />
      </fieldset>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Prénom" name="firstName" autoComplete="given-name" required />
        <TextField label="Nom" name="lastName" autoComplete="family-name" required />
        <TextField label="NPI" name="npi" inputMode="numeric" maxLength={10} required hint="10 chiffres" />
        <TextField label="Téléphone" name="phone" type="tel" autoComplete="tel" required placeholder="01 97 00 00 00" />
        <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required className="sm:col-span-2" />
        <TextField label="Ville" name="city" autoComplete="address-level2" placeholder="Cotonou" />
        <TextField label="Quartier ou adresse" name="address" autoComplete="street-address" />
        <TextField label="Mot de passe" name="password" type="password" autoComplete="new-password" required hint="10 caractères, lettres et chiffres" />
        <TextField label="Confirmation" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-brand-600" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" target="_blank" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="font-medium text-brand-700 underline-offset-2 hover:underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <FieldError name="acceptTerms" />
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Création du compte…">
        Créer mon compte
      </SubmitButton>
      <p className="text-center text-xs text-slate-400">Les comptes administrateurs sont créés uniquement par l&apos;équipe Access.</p>
    </ActionForm>
  );
}
