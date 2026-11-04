import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand";
import { LEGAL_PAGES } from "@/components/legal-page";

const navLinks = [
  { href: "/fonctionnement", label: "Fonctionnement" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/nos-educateurs", label: "Éducateurs" },
  { href: "/devenir-tuteur", label: "Tuteurs" },
  { href: "/confiance", label: "Confiance" },
  { href: "/aide", label: "Aide" },
];

const footerColumns = [
  {
    title: "Familles",
    links: [
      { href: "/fonctionnement", label: "Comment ça marche" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/nos-educateurs", label: "Nos éducateurs" },
      { href: "/fonctionnement#suivi", label: "Le suivi au quotidien" },
      { href: "/matieres", label: "Matières et classes" },
      { href: "/avis", label: "Avis des familles" },
    ],
  },
  {
    title: "Intervenants",
    links: [
      { href: "/devenir-educateur", label: "Devenir éducateur" },
      { href: "/devenir-tuteur", label: "Devenir tuteur" },
      { href: "/fonctionnement#educateurs", label: "Le suivi des séances" },
      { href: "/inscription", label: "Créer mon compte" },
    ],
  },
  {
    title: "Access",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/confiance", label: "Confiance et sécurité" },
      { href: "/aide", label: "Aide" },
      { href: "/contact", label: "Contact" },
    ],
  },
  { title: "Informations légales", links: LEGAL_PAGES },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      {/* Barre de navigation flottante, en pilule. */}
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full bg-white/85 pr-2 pl-5 shadow-[0_0_0_1px_rgb(15_23_42/0.07),0_10px_30px_-12px_rgb(15_23_42/0.15)] backdrop-blur-xl">
          <Logo />
          <nav className="hidden items-center gap-7 text-15px font-medium text-slate-600 lg:flex" aria-label="Navigation principale">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/connexion" className="hidden h-11 items-center rounded-full px-4 text-15px font-medium text-slate-600 transition hover:text-ink sm:inline-flex">
              Connexion
            </Link>
            <Link
              href="/inscription"
              className="inline-flex h-11 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-brand-700"
            >
              Créer un compte
            </Link>
            {/* Menu mobile : <details> natif, sans JavaScript. */}
            <details className="group lg:hidden">
              <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 [&::-webkit-details-marker]:hidden" aria-label="Menu">
                <Menu className="size-5" aria-hidden />
              </summary>
              <nav
                aria-label="Navigation mobile"
                className="absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-1 rounded-3xl bg-white p-3 shadow-[0_0_0_1px_rgb(15_23_42/0.07),0_20px_40px_-16px_rgb(15_23_42/0.25)]"
              >
                {[...navLinks, { href: "/connexion", label: "Connexion" }].map((l) => (
                  <Link key={l.href} href={l.href} className="rounded-2xl px-4 py-3 text-base font-medium text-ink hover:bg-canvas">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">L&apos;accompagnement scolaire à domicile et le suivi au quotidien, en confiance. Partout au Bénin.</p>
          </div>
          {footerColumns.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-ink">{c.title}</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:px-6">
            <p>© {new Date().getFullYear()} Access</p>
            <p>
              Powered by{" "}
              <a href="https://www.augustinfachehoun.pro/fr" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-brand-600">
                AF
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
