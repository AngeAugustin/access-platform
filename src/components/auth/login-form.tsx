"use client";

import Link from "next/link";
import { loginAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, SubmitButton, TextField } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-5">
      <FormMessage />
      <input type="hidden" name="suite" value={next ?? ""} />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" required />
      <div>
        <TextField label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
        <div className="mt-2 text-right">
          <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
      <SubmitButton className="w-full" size="lg" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>
    </ActionForm>
  );
}
