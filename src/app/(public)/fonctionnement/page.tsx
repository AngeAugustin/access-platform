import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero, pillDark, pillLight, Section, Steps } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Le parcours des familles et des éducateurs sur Access, de l'inscription au paiement, et comment installer l'application.",
};

const installGuides = [
  {
    title: "Android (Chrome)",
    steps: ["Ouvrez le site Access dans Chrome.", "Touchez le menu ⋮ en haut à droite.", "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »."],
  },
  {
    title: "iPhone (Safari)",
    steps: ["Ouvrez le site Access dans Safari.", "Touchez le bouton Partager, en bas de l'écran.", "Choisissez « Sur l'écran d'accueil », puis « Ajouter »."],
  },
  {
    title: "Ordinateur",
    steps: ["Ouvrez le site Access dans Chrome ou Edge.", "Cliquez sur l'icône d'installation dans la barre d'adresse.", "Confirmez avec « Installer »."],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="Comment ça marche"
        title="Tout se passe depuis votre téléphone."
        actions={
          <>
            <Link href="#familles" className={pillDark}>
              Je suis parent
            </Link>
            <Link href="#educateurs" className={pillLight}>
              Je suis éducateur
            </Link>
          </>
        }
      >
        <p>Access accompagne chaque tutorat du premier contact au dernier paiement. Voici le parcours, selon que vous êtes parent ou éducateur.</p>
      </PageHero>

      <Section id="familles" eyebrow="Pour les familles" title="Quatre étapes pour démarrer.">
        <Steps
          items={[
            { title: "Créez votre compte", text: "Puis inscrivez chaque enfant : classe, école et niveau dans chaque matière." },
            { title: "Choisissez un éducateur", text: "Filtrez par classe, matière, quartier et jour. Comparez les profils vérifiés, leurs notes et les avis." },
            { title: "Créez le tutorat", text: "Choisissez les créneaux libres et la durée. Le prix et le calendrier des échéances s'affichent avant de valider." },
            { title: "Suivez et payez", text: "Confirmez chaque séance après le cours et réglez chaque échéance en Mobile Money." },
          ]}
        />
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { title: "Pendant le tutorat", text: "Un compte rendu après chaque séance, des rappels avant chaque échéance, et la possibilité de contester une séance." },
            { title: "À la fin", text: "Le tutorat se termine à la date prévue. Vous pouvez laisser un avis sur l'éducateur pour aider les autres familles." },
            { title: "Si besoin d'arrêter", text: "Vous arrêtez quand vous voulez, en indiquant un motif. La période en cours est due au prorata, les suivantes sont annulées." },
          ].map((c) => (
            <div key={c.title} className="rounded-[28px] bg-white p-7 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
              <h3 className="font-display text-xl font-bold tracking-tight text-ink">{c.title}</h3>
              <p className="mt-2 text-15px leading-relaxed text-slate-600">{c.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="educateurs" eyebrow="Pour les éducateurs" title="De votre dossier à vos paiements.">
        <Steps
          items={[
            { title: "Inscrivez-vous", text: "Créez votre compte éducateur avec votre NPI et vos coordonnées." },
            { title: "Constituez votre dossier", text: "Pièces justificatives, matières, classes, zone, disponibilités et deux garants." },
            { title: "Faites-vous valider", text: "L'équipe Access vérifie le dossier et vous attribue une note et un niveau." },
            { title: "Enseignez, notez, soyez payé", text: "Saisissez chaque séance ; recevez votre part de chaque échéance payée sur votre Mobile Money." },
          ]}
        />
        <p className="mt-8 text-slate-600">
          Tous les détails sur la page <Link href="/devenir-educateur" className="font-semibold text-brand-700 hover:underline">Devenir éducateur</Link>.
        </p>
      </Section>

      <Section
        id="installer"
        eyebrow="L'application"
        title="Installez Access en 30 secondes."
        intro={<p>Pas besoin de store : Access s&apos;installe directement depuis le navigateur, prend peu de place et vous envoie des notifications.</p>}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {installGuides.map((g) => (
            <div key={g.title} className="rounded-[28px] bg-canvas p-7">
              <h3 className="font-display text-xl font-bold tracking-tight text-ink">{g.title}</h3>
              <ol className="mt-4 space-y-3">
                {g.steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-15px leading-relaxed text-slate-600">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand title="On commence ?" />
    </>
  );
}
