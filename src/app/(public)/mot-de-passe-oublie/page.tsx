import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-slate-600">Nous vous envoyons un code à 6 chiffres, valable 15 minutes.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/reinitialiser" className="text-brand-700 hover:underline">
          J&apos;ai déjà un code
        </Link>
      </p>
    </div>
  );
}
