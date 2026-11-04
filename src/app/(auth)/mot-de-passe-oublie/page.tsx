import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Mot de passe oublié" subtitle="Nous vous envoyons un code à 6 chiffres, valable 15 minutes." />
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/reinitialiser" className="font-semibold text-brand-600 hover:text-brand-700">
          J&apos;ai déjà un code
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/connexion" className="font-semibold text-brand-600 hover:text-brand-700">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
