import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Créer un compte</h1>
      <p className="mt-1 text-sm text-slate-600">Les comptes administrateurs sont créés uniquement par l&apos;équipe Access.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <RegisterForm defaultRole={role === "EDUCATOR" ? "EDUCATOR" : "PARENT"} />
      </div>
    </div>
  );
}
