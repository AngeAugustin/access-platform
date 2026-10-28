import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <>
      <AuthHeading title="Créer un compte" subtitle="Gratuit, en moins de deux minutes." />
      <RegisterForm defaultRole={role === "EDUCATOR" ? "EDUCATOR" : "PARENT"} />
      <p className="mt-8 text-center text-sm text-slate-500">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand-700 hover:text-brand-800">
          Se connecter
        </Link>
      </p>
    </>
  );
}
