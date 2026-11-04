import { Suspense } from "react";
import "@fontsource-variable/bricolage-grotesque";
import { AuthAside, AuthMobileHeader, AuthRoleProvider, AuthTopBar } from "@/components/auth/auth-panel";
import { featuredReview } from "@/server/queries/public";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Un avis indisponible ne doit pas empêcher de se connecter : le panneau affiche alors son accroche.
  const review = await featuredReview().catch(() => null);
  return (
    <AuthRoleProvider>
      {/* Sur grand écran, la page tient dans la fenêtre : seule la colonne du formulaire défile si besoin. */}
      <div className="flex min-h-dvh bg-white lg:h-dvh lg:gap-3 lg:p-3">
        {/* Le panneau lit l'URL (rôle choisi) : Suspense évite de rendre toute la page côté client. */}
        <Suspense>
          <AuthAside review={review} />
        </Suspense>
        <main className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
          <Suspense>
            <AuthMobileHeader />
          </Suspense>
          <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[28px] bg-white px-5 pt-7 pb-5 sm:px-8 lg:mt-0 lg:rounded-none lg:px-10 lg:pt-3 lg:pb-2">
            <Suspense>
              <AuthTopBar />
            </Suspense>
            <div className="flex flex-1 items-center justify-center lg:py-6">
              {/* Champs plus hauts et plus arrondis que dans les espaces connectés. */}
              <div className="w-full max-w-[440px] auth-fields animate-fade-in">{children}</div>
            </div>
            <p className="mt-5 text-right text-13px text-slate-500">
              Powered by{" "}
              <a href="https://www.augustinfachehoun.pro/fr" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-brand-600">
                AF
              </a>
            </p>
          </div>
        </main>
      </div>
    </AuthRoleProvider>
  );
}
