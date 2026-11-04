import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, GraduationCap, Users } from "lucide-react";
import { Notice } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";
import { AuthHeading } from "@/components/auth/auth-heading";

export const metadata: Metadata = { title: "Connexion" };

const signUps = [
  { role: "PARENT", label: "Je suis parent", icon: Users },
  { role: "EDUCATOR", label: "Je suis éducateur", icon: GraduationCap },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string; reinitialise?: string }> }) {
  const { suite, reinitialise } = await searchParams;
  return (
    <>
      <AuthHeading title="Bon retour parmi nous" subtitle="Parents, éducateurs et équipe Access : un seul accès." />
      {reinitialise && (
        <div className="mb-5">
          <Notice tone="green" icon={CircleCheck} title="Mot de passe modifié">
            Connectez-vous avec votre nouveau mot de passe. Vos autres appareils ont été déconnectés.
          </Notice>
        </div>
      )}
      <LoginForm next={suite} />
      <p className="my-6 flex items-center gap-3 text-xs font-medium tracking-wider text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
        Nouveau sur Access ?
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {signUps.map((s) => (
          <Link
            key={s.role}
            href={`/inscription?role=${s.role}`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-semibold text-ink transition hover:border-slate-300 hover:bg-slate-50"
          >
            <s.icon className="size-4 text-accent-500" aria-hidden />
            {s.label}
          </Link>
        ))}
      </div>
    </>
  );
}
