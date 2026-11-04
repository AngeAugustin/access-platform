import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, PageHero, pillDark, Section, type Faq } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Aide",
  description: "Les réponses aux questions fréquentes sur le compte, les éducateurs, les séances et les paiements Access.",
};

const topics: { id: string; title: string; items: Faq[] }[] = [
  {
    id: "compte",
    title: "Mon compte",
    items: [
      { q: "Qui peut créer un compte ?", a: "Les parents d'élèves, les éducateurs et les tuteurs, partout au Bénin. L'inscription demande votre NPI, une adresse e-mail et un numéro de téléphone." },
      {
        q: "J'ai oublié mon mot de passe.",
        a: (
          <>
            Sur la page de connexion, choisissez <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>. Vous recevez par e-mail un code à 6 chiffres, valable 15
            minutes, pour en choisir un nouveau.
          </>
        ),
      },
      {
        q: "Mon compte est verrouillé.",
        a: (
          <>
            Après 5 tentatives de connexion échouées, le compte est verrouillé 24 heures par sécurité. Il se débloque seul ensuite ; pour le débloquer plus tôt, contactez
            l&apos;équipe Access via la page <Link href="/contact">Contact</Link>. Réinitialiser son mot de passe ne lève pas le verrou.
          </>
        ),
      },
      { q: "On m'a donné un mot de passe provisoire.", a: "C'est le cas après une réinitialisation par l'équipe Access. À votre prochaine connexion, il vous est demandé de le remplacer par un mot de passe de votre choix." },
      { q: "Comment modifier mes informations ?", a: "Depuis la page Profil de votre espace : nom, prénom, téléphone, ville, adresse et mot de passe. Pour changer votre NPI ou votre e-mail, contactez l'équipe Access." },
    ],
  },
  {
    id: "educateurs",
    title: "Les éducateurs",
    items: [
      {
        q: "Comment les éducateurs sont-ils vérifiés ?",
        a: (
          <>
            Pièce d&apos;identité, casier judiciaire, diplômes et deux garants, examinés par l&apos;équipe Access avant toute mise en relation. Détails sur la page{" "}
            <Link href="/confiance">Confiance et sécurité</Link>.
          </>
        ),
      },
      { q: "Que signifient la note et le niveau ?", a: "Ils sont attribués par l'équipe Access à la validation du dossier, d'après le parcours et l'expérience de l'éducateur. Les avis des familles s'affichent à côté." },
      { q: "Puis-je changer d'éducateur ?", a: "Oui : arrêtez l'accompagnement en cours en indiquant le motif, puis créez-en un nouveau avec un autre éducateur." },
    ],
  },
  {
    id: "seances",
    title: "Les séances",
    items: [
      { q: "Comment suis-je informé d'une séance ?", a: "Après chaque cours, l'éducateur saisit un compte rendu. Vous recevez une notification et le confirmez ou le contestez depuis votre espace." },
      { q: "Que se passe-t-il si je conteste une séance ?", a: "L'éducateur et l'équipe Access sont prévenus. L'équipe examine la séance, puis la confirme ou la retire ; vous êtes informé de sa décision." },
      { q: "Les créneaux peuvent-ils changer ?", a: "Les créneaux sont fixés à la création de l'accompagnement. Pour un empêchement ponctuel, prévenez l'éducateur directement ; pour un changement durable, contactez l'équipe Access." },
    ],
  },
  {
    id: "paiements",
    title: "Les paiements",
    items: [
      {
        q: "Combien coûte un accompagnement ?",
        a: (
          <>
            Le tarif dépend de la classe. Consultez la grille et le simulateur sur la page <Link href="/tarifs">Tarifs</Link>.
          </>
        ),
      },
      { q: "Comment payer ?", a: "Depuis votre espace, par MTN MoMo, Moov Money ou carte bancaire, sur la page sécurisée de FedaPay. Un rappel est envoyé avant chaque échéance." },
      { q: "Mon paiement n'apparaît pas.", a: "La confirmation de l'opérateur peut prendre quelques minutes. Si l'échéance reste impayée après votre paiement, déposez une réclamation avec la référence de la transaction." },
      { q: "Comment l'éducateur est-il payé ?", a: "Access lui reverse sa part de chaque échéance payée, sur son numéro Mobile Money. Vous n'avez jamais à le payer directement." },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero eyebrow="Aide" title="Comment pouvons-nous vous aider ?">
        <p>Les réponses aux questions les plus fréquentes. Vous ne trouvez pas la vôtre ? Écrivez-nous.</p>
        <nav aria-label="Thèmes" className="mt-8 flex flex-wrap gap-2">
          {topics.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="rounded-full bg-canvas px-4 py-2 text-15px font-medium text-ink transition hover:bg-slate-100">
              {t.title}
            </a>
          ))}
        </nav>
      </PageHero>

      {topics.map((t) => (
        <Section key={t.id} id={t.id} className="pb-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr]">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink">{t.title}</h2>
            <FaqList items={t.items} />
          </div>
        </Section>
      ))}

      <Section className="pt-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] bg-canvas p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Toujours une question ?</h2>
            <p className="mt-1.5 text-slate-600">Déjà inscrit : déposez une réclamation depuis votre espace. Sinon, écrivez-nous.</p>
          </div>
          <Link href="/contact" className={pillDark}>
            Nous contacter
          </Link>
        </div>
      </Section>
    </>
  );
}
