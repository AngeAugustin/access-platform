import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/constants";
import { LinkButton } from "@/components/ui";

const steps = [
  ["Inscrivez votre enfant", "Sa classe, son école et son niveau dans chaque matière."],
  ["Choisissez un éducateur vérifié", "Identité, casier judiciaire et diplômes contrôlés par Access."],
  ["Suivez chaque séance", "L'éducateur décrit le travail effectué, vous confirmez."],
  ["Payez en Mobile Money", "Des échéances toutes les 4 semaines, réglées en ligne."],
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-700 to-brand-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">Le bon répétiteur pour votre enfant, en toute confiance.</h1>
          <p className="mt-4 max-w-xl text-brand-100">
            Access met en relation les familles et des éducateurs vérifiés, du collège à la terminale, à Cotonou et Abomey-Calavi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/inscription?role=PARENT" variant="secondary">
              Je suis parent
            </LinkButton>
            <LinkButton href="/inscription?role=EDUCATOR" className="bg-accent-500 text-slate-900 hover:bg-amber-400">
              Je suis éducateur
            </LinkButton>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, text], i) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-brand-600">Étape {i + 1}</p>
            <h2 className="mt-1 font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
