import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/constants";
import { ProvisionalPasswordForm } from "@/components/auth/password-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LogoutButton } from "@/components/shell/logout-button";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

export default async function ProvisionalPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (!user.mustChangePassword) redirect(ROLE_HOME[user.role]);
  return (
    <>
      <AuthHeading
        title="Choisissez votre mot de passe"
        subtitle="Votre mot de passe a été réinitialisé par l'équipe Access. Remplacez le mot de passe provisoire pour accéder à votre espace."
      />
      <ProvisionalPasswordForm />
      <div className="mt-6 flex justify-center">
        <LogoutButton variant="full" />
      </div>
    </>
  );
}
