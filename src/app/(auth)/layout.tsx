import { BadgeCheck, NotebookPen, Wallet } from "lucide-react";
import { Logo } from "@/components/brand";

const points = [
  { icon: BadgeCheck, title: "Éducateurs vérifiés", text: "Identité, casier judiciaire et diplômes contrôlés." },
  { icon: NotebookPen, title: "Chaque séance tracée", text: "Un compte rendu à confirmer après chaque cours." },
  { icon: Wallet, title: "Paiement Mobile Money", text: "MTN, Moov ou carte, par échéances de 4 semaines." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-32 -left-24 size-96 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
        <div className="absolute -right-24 bottom-0 size-80 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
        <div className="relative">
          <Logo tone="light" />
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">Le suivi scolaire de vos enfants, en toute confiance.</h2>
          <ul className="mt-10 space-y-6">
            {points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <p.icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{p.title}</span>
                  <span className="block text-sm text-brand-200">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-brand-300">Cotonou · Abomey-Calavi</p>
      </aside>
      <main className="flex flex-col bg-white">
        <div className="px-4 pt-6 sm:px-8 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[440px] animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
