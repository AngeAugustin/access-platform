import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { readResetFlow } from "@/lib/auth/reset-flow";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage() {
  // Accessible seulement après la vérification du code (étape précédente).
  if (!(await readResetFlow())?.code) redirect("/reinitialiser");
  return (
    <>
      <AuthHeading title="Nouveau mot de passe" subtitle="Code vérifié. Choisissez votre nouveau mot de passe : vous serez déconnecté de tous vos appareils." />
      <ResetPasswordForm />
    </>
  );
}
