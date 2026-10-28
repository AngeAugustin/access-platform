"use client";

import Link from "next/link";
import { registerAction } from "@/server/actions/auth";
import { ActionForm, FieldError, FormMessage, SubmitButton, TextField } from "@/components/ui/form";

export function RegisterForm({ defaultRole }: { defaultRole: "PARENT" | "EDUCATOR" }) {
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <FormMessage />
      <fieldset>
        <legend className="label">Je m&apos;inscris en tant que</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["PARENT", "Parent", "Je cherche un éducateur"],
            ["EDUCATOR", "Éducateur", "Je propose mes services"],
          ].map(([value, title, text]) => (
            <label key={value} className="flex cursor-pointer gap-2 rounded-lg border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="radio" name="role" value={value} defaultChecked={value === defaultRole} className="mt-1" />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-slate-600">{text}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError name="role" />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Prénom" name="firstName" autoComplete="given-name" required />
        <TextField label="Nom" name="lastName" autoComplete="family-name" required />
        <TextField label="NPI" name="npi" inputMode="numeric" maxLength={10} required hint="Numéro personnel d'identification, 10 chiffres." />
        <TextField label="Téléphone" name="phone" type="tel" autoComplete="tel" required placeholder="01 97 00 00 00" />
        <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required className="sm:col-span-2" />
        <TextField label="Ville" name="city" autoComplete="address-level2" placeholder="Cotonou" />
        <TextField label="Adresse" name="address" autoComplete="street-address" />
        <TextField label="Mot de passe" name="password" type="password" autoComplete="new-password" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
        <TextField label="Confirmer le mot de passe" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-1" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/conditions" target="_blank" className="text-brand-700 underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" target="_blank" className="text-brand-700 underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <FieldError name="acceptTerms" />
      </div>
      <SubmitButton className="w-full" pendingLabel="Création…">
        Créer mon compte
      </SubmitButton>
    </ActionForm>
  );
}
