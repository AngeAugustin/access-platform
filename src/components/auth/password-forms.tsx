"use client";

import { KeyRound, Lock, Mail } from "lucide-react";
import { changePasswordAction, forgotPasswordAction, resetPasswordAction, verifyResetCodeAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { PowGuard } from "@/components/security/pow-guard";
import { NewPasswordFields } from "@/components/auth/new-password-fields";

export function ForgotPasswordForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-5">
      <FormMessage />
      <PowGuard purpose="forgot" />
      <TextField label="Adresse e-mail du compte" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" icon={Mail} required />
      <SubmitButton className="w-full rounded-2xl!" size="lg">
        Recevoir un code
      </SubmitButton>
    </ActionForm>
  );
}

// Étape 2. L'adresse est connue quand on arrive de « Mot de passe oublié » ; sinon (lien « J'ai déjà un code »), on la demande.
export function ResetCodeForm({ knownEmail }: { knownEmail: boolean }) {
  return (
    <ActionForm action={verifyResetCodeAction} className="space-y-5">
      <FormMessage />
      {!knownEmail && <TextField label="Adresse e-mail du compte" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" icon={Mail} required />}
      <TextField
        label="Code reçu"
        name="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="one-time-code"
        icon={KeyRound}
        placeholder="6 chiffres"
        autoFocus={knownEmail}
        required
      />
      <SubmitButton className="w-full rounded-2xl!" size="lg">
        Vérifier le code
      </SubmitButton>
    </ActionForm>
  );
}

// Étape 3 : le code a été vérifié à l'écran précédent.
export function ResetPasswordForm() {
  return (
    <ActionForm action={resetPasswordAction} className="space-y-5">
      <FormMessage />
      <NewPasswordFields label="Nouveau mot de passe" confirmLabel="Confirmer le mot de passe" icon={Lock} />
      <SubmitButton className="w-full rounded-2xl!" size="lg">
        Changer le mot de passe
      </SubmitButton>
    </ActionForm>
  );
}

export function ChangePasswordForm() {
  return (
    <ActionForm
      action={changePasswordAction}
      className="space-y-5"
      resetOnSuccess
      confirm={{ title: "Modifier le mot de passe ?", description: "Utilisez le nouveau mot de passe dès votre prochaine connexion.", confirmLabel: "Modifier" }}
    >
      <FormMessage />
      <PasswordField label="Mot de passe actuel" name="currentPassword" autoComplete="current-password" required />
      <NewPasswordFields label="Nouveau mot de passe" confirmLabel="Confirmer" />
      <SubmitButton>Modifier le mot de passe</SubmitButton>
    </ActionForm>
  );
}

// Remplacement obligatoire du mot de passe provisoire fixé par un administrateur.
export function ProvisionalPasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="space-y-5">
      <FormMessage />
      <PasswordField label="Mot de passe provisoire" name="currentPassword" autoComplete="current-password" icon={Lock} required />
      <NewPasswordFields label="Nouveau mot de passe" confirmLabel="Confirmer" icon={Lock} />
      <SubmitButton className="w-full rounded-2xl!" size="lg">
        Enregistrer et continuer
      </SubmitButton>
    </ActionForm>
  );
}
