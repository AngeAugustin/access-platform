import type { Metadata } from "next";
import Link from "next/link";
import { ResetCodeForm } from "@/components/auth/password-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { maskEmail, readResetFlow } from "@/lib/auth/reset-flow";

export const metadata: Metadata = { title: "Saisir le code" };

export default async function ResetCodePage() {
  const flow = await readResetFlow();
  return (
    <>
      <AuthHeading
        title="Saisissez le code"
        subtitle={
          flow ? (
            <>
              Si un compte correspond à <span className="font-semibold text-ink">{maskEmail(flow.email)}</span>, un code à 6 chiffres vient d&apos;y être envoyé. Il expire dans 15
              minutes.
            </>
          ) : (
            "Saisissez l'adresse de votre compte et le code à 6 chiffres reçu par e-mail."
          )
        }
      />
      <ResetCodeForm knownEmail={Boolean(flow)} />
      <p className="mt-8 text-center text-sm text-slate-500">
        Rien reçu ? Vérifiez vos courriers indésirables ou{" "}
        <Link href="/mot-de-passe-oublie" className="font-semibold text-brand-600 hover:text-brand-700">
          demandez un nouveau code
        </Link>
        .
      </p>
    </>
  );
}
