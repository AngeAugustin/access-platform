"use client";

import Link from "next/link";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { ActionForm, FormMessage, PasswordField, SubmitButton, TextField } from "@/components/ui/form";
import { PowGuard } from "@/components/security/pow-guard";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginAction} className="space-y-5">
      <FormMessage />
      <input type="hidden" name="suite" value={next ?? ""} />
      <PowGuard purpose="login" mode="on-demand" />
      <TextField label="Adresse e-mail" name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" icon={Mail} required />
      <PasswordField label="Mot de passe" name="password" autoComplete="current-password" icon={Lock} required />
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-slate-600">
          <input type="checkbox" name="remember" defaultChecked className="size-4 accent-brand-600" />
          Rester connecté
        </label>
        <Link href="/mot-de-passe-oublie" className="font-semibold text-brand-600 hover:text-brand-700">
          Mot de passe oublié ?
        </Link>
      </div>
      <SubmitButton className="w-full rounded-2xl! shadow-[0_8px_20px_-8px_rgb(0_74_173/0.6)]!" size="lg" pendingLabel="Connexion…">
        Se connecter
        <ArrowRight aria-hidden />
      </SubmitButton>
    </ActionForm>
  );
}
