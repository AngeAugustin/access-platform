"use client";

import Link from "next/link";
import { changePasswordAction, forgotPasswordAction, resetPasswordAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, SubmitButton, TextField, useFormState } from "@/components/ui/form";

export function ForgotPasswordForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-5">
      <FormMessage />
      <TextField label="Adresse e-mail du compte" name="email" type="email" autoComplete="email" required />
      <SubmitButton className="w-full" size="lg">
        Recevoir un code
      </SubmitButton>
      <NextStep />
    </ActionForm>
  );
}

function NextStep() {
  const { state } = useFormState();
  if (!state.ok) return null;
  return (
    <Link href="/reinitialiser" className="block text-center text-sm font-semibold text-brand-700 hover:text-brand-800">
      Saisir le code →
    </Link>
  );
}

export function ResetPasswordForm({ email }: { email?: string }) {
  return (
    <ActionForm action={resetPasswordAction} className="space-y-5">
      <FormMessage />
      <TextField label="Adresse e-mail" name="email" type="email" defaultValue={email} autoComplete="email" required />
      <TextField label="Code reçu" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
      <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
      <TextField label="Confirmer" name="confirmPassword" type="password" autoComplete="new-password" required />
      <SubmitButton className="w-full" size="lg">
        Changer le mot de passe
      </SubmitButton>
      <LoginLink />
    </ActionForm>
  );
}

function LoginLink() {
  const { state } = useFormState();
  if (!state.ok) return null;
  return (
    <Link href="/connexion" className="block text-center text-sm font-semibold text-brand-700 hover:text-brand-800">
      Se connecter →
    </Link>
  );
}

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <TextField label="Mot de passe actuel" name="currentPassword" type="password" autoComplete="current-password" required />
      <TextField label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required hint="10 caractères minimum, avec au moins une lettre et un chiffre." />
      <TextField label="Confirmer" name="confirmPassword" type="password" autoComplete="new-password" required />
      <SubmitButton>Modifier le mot de passe</SubmitButton>
    </ActionForm>
  );
}
