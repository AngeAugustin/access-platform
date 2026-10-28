import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <>
      <AuthHeading title="Bon retour parmi nous" subtitle="Parents, éducateurs et équipe Access utilisent le même accès." />
      <LoginForm next={suite} />
      <p className="mt-8 text-center text-sm text-slate-500">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-brand-700 hover:text-brand-800">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
