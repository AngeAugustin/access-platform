import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Access
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/connexion" className="text-slate-700 hover:text-brand-700">
              Connexion
            </Link>
            <Link href="/inscription" className="font-semibold text-brand-700">
              Créer un compte
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© Access — Tutorat scolaire au Bénin</p>
        <p className="mt-1 space-x-3">
          <Link href="/conditions" className="hover:underline">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" className="hover:underline">
            Confidentialité
          </Link>
        </p>
      </footer>
    </div>
  );
}
