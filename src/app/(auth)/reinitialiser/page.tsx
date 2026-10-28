import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <>
      <AuthHeading title="Nouveau mot de passe" subtitle="Saisissez le code reçu par e-mail. Après 5 essais erronés, il est invalidé." />
      <ResetPasswordForm email={email} />
    </>
  );
}
