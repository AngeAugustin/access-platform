import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
      <p className="mt-1 text-sm text-slate-600">Saisissez le code reçu par e-mail. Après 5 essais erronés, le code est invalidé.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <ResetPasswordForm email={email} />
      </div>
    </div>
  );
}
