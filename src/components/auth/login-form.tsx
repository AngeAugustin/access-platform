"use client";

import { loginAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, SubmitButton, TextField } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <FormMessage />
      <input type="hidden" name="suite" value={next ?? ""} />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" required />
      <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className="w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </ActionForm>
  );
}
