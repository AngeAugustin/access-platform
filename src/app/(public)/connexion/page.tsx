import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-slate-600">Parents, éducateurs et administrateurs utilisent le même accès.</p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <LoginForm next={suite} />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-brand-700 hover:underline">
          Mot de passe oublié ?
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/inscription" className="text-brand-700 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
