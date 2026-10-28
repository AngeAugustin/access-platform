import Link from "next/link";
import { Logo } from "@/components/brand";
import { buttonClass } from "@/components/ui";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/#fonctionnement" className="transition hover:text-ink">
              Fonctionnement
            </Link>
            <Link href="/#familles" className="transition hover:text-ink">
              Familles
            </Link>
            <Link href="/#educateurs" className="transition hover:text-ink">
              Éducateurs
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/connexion" className={buttonClass("ghost", undefined, "sm")}>
              Connexion
            </Link>
            <Link href="/inscription" className={buttonClass("primary", undefined, "sm")}>
              Créer un compte
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500">Le tutorat scolaire à domicile, en confiance. Cotonou et Abomey-Calavi.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link href="/conditions" className="hover:text-ink">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/confidentialite" className="hover:text-ink">
              Confidentialité
            </Link>
            <span>© {new Date().getFullYear()} Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
