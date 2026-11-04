import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <>
      <RegisterForm defaultRole={role === "EDUCATOR" || role === "TUTOR" ? role : "PARENT"} />
      {/* Sur grand écran, le lien est dans la barre du haut. */}
      <p className="mt-8 text-center text-sm text-slate-500 lg:hidden">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </>
  );
}
