import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ToComplete, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

const sections: LegalSection[] = [
  {
    id: "objet",
    title: "Objet",
    content: (
      <>
        <p>
          Access est une plateforme qui met en relation des parents d&apos;élèves et des éducateurs indépendants pour du tutorat scolaire à domicile, du collège à la
          terminale, à Cotonou et Abomey-Calavi. Elle assure la vérification des éducateurs, le suivi des séances, l&apos;encaissement des paiements et leur reversement.
        </p>
        <p>
          Les présentes conditions régissent l&apos;utilisation d&apos;Access par tous ses utilisateurs. Les accepter est nécessaire pour créer un compte. Access est édité
          par <ToComplete>raison sociale</ToComplete> (voir les <Link href="/mentions-legales">mentions légales</Link>).
        </p>
      </>
    ),
  },
  {
    id: "compte",
    title: "Votre compte",
    content: (
      <ul>
        <li>Le compte est personnel. Vous fournissez des informations exactes et à jour : identité, NPI, e-mail, téléphone.</li>
        <li>Vous gardez votre mot de passe confidentiel et nous prévenez sans délai de toute utilisation suspecte.</li>
        <li>
          Après 5 tentatives de connexion échouées, le compte est verrouillé pendant 24 heures. Seule l&apos;équipe Access peut lever ce verrou avant son expiration.
        </li>
        <li>
          L&apos;équipe Access peut réinitialiser votre mot de passe à votre demande. Vous devez alors choisir un nouveau mot de passe à votre prochaine connexion.
        </li>
      </ul>
    ),
  },
  {
    id: "parents",
    title: "Engagements des parents",
    content: (
      <ul>
        <li>Vous êtes le parent ou le représentant légal des enfants que vous inscrivez, et les informations que vous donnez à leur sujet sont exactes.</li>
        <li>Vous accueillez l&apos;éducateur aux créneaux convenus et le prévenez en cas d&apos;empêchement.</li>
        <li>Après chaque séance, vous confirmez ou contestez sincèrement le compte rendu de l&apos;éducateur.</li>
        <li>Vous réglez les échéances à leur date.</li>
      </ul>
    ),
  },
  {
    id: "educateurs",
    title: "Engagements des éducateurs",
    content: (
      <>
        <p>
          Un éducateur n&apos;est proposé aux familles qu&apos;après la validation de son dossier par Access : pièce d&apos;identité, casier judiciaire, diplômes et deux
          garants. Access lui attribue alors une note et un niveau, qu&apos;elle peut revoir à tout moment.
        </p>
        <ul>
          <li>Il fournit des pièces authentiques et signale tout changement de situation, notamment judiciaire.</li>
          <li>Il intervient en personne, aux créneaux convenus, et adopte un comportement irréprochable envers l&apos;enfant et sa famille.</li>
          <li>Il saisit fidèlement chaque séance réalisée.</li>
          <li>Il ne propose pas aux familles rencontrées via Access de le payer en dehors de la plateforme.</li>
        </ul>
        <p>
          L&apos;éducateur exerce en indépendant : il n&apos;est pas salarié d&apos;Access et reste responsable de ses obligations fiscales et sociales.
        </p>
      </>
    ),
  },
  {
    id: "tarifs",
    title: "Tarifs et paiements",
    content: (
      <ul>
        <li>
          Le prix d&apos;un tutorat découle de la grille tarifaire par classe en vigueur à sa création. Il est affiché avant tout engagement et ne change pas en cours de
          tutorat.
        </li>
        <li>
          Le tutorat est réglé par échéances couvrant chacune quatre semaines, en ligne via FedaPay (MTN MoMo, Moov Money ou carte). Un rappel est envoyé avant chaque
          échéance.
        </li>
        <li>
          Access reverse à l&apos;éducateur, sur son compte Mobile Money, le montant de chaque échéance payée, déduction faite de la commission d&apos;Access (
          <ToComplete>taux de commission en vigueur</ToComplete>).
        </li>
      </ul>
    ),
  },
  {
    id: "arret",
    title: "Arrêt d'un tutorat",
    content: (
      <p>
        Le parent peut arrêter un tutorat à tout moment, en indiquant un motif. La période en cours est recalculée au prorata des semaines entamées et payable sous une
        semaine ; les échéances suivantes sont annulées. Les sommes déjà payées pour des semaines non effectuées font l&apos;objet d&apos;un examen par Access en vue
        d&apos;un éventuel remboursement. Access peut aussi arrêter un tutorat, notamment en cas de manquement grave.
      </p>
    ),
  },
  {
    id: "seances",
    title: "Séances contestées et réclamations",
    content: (
      <>
        <p>
          Une séance contestée par le parent est examinée par l&apos;équipe Access, qui peut la confirmer ou la retirer. Pour tout autre différend, une réclamation se
          dépose depuis l&apos;application ; Access y répond dans un délai raisonnable.
        </p>
        <p>À la fin d&apos;un tutorat, le parent peut laisser un avis sur l&apos;éducateur. L&apos;avis doit être sincère et courtois ; Access peut retirer un avis abusif.</p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension et désactivation",
    content: (
      <>
        <p>En cas de manquement à ces conditions, d&apos;usage frauduleux ou de comportement mettant en danger un enfant, Access peut :</p>
        <ul>
          <li>suspendre un compte, à titre temporaire ;</li>
          <li>désactiver un compte, ce qui le ferme ;</li>
          <li>retirer un éducateur des propositions faites aux familles.</li>
        </ul>
        <p>Le titulaire est déconnecté immédiatement. Les données sont conservées comme le prévoit la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    content: (
      <p>
        Access vérifie les dossiers des éducateurs avec soin mais ne peut garantir les résultats scolaires d&apos;un élève. La plateforme est fournie en l&apos;état ;
        Access s&apos;efforce d&apos;en assurer la disponibilité mais peut l&apos;interrompre pour maintenance. <ToComplete>Clauses de limitation de responsabilité à
        valider</ToComplete>.
      </p>
    ),
  },
  {
    id: "droit",
    title: "Droit applicable",
    content: (
      <p>
        Ces conditions sont régies par le droit béninois. À défaut d&apos;accord amiable, tout litige relève des juridictions compétentes de{" "}
        <ToComplete>ville</ToComplete>. Access peut faire évoluer ces conditions ; les utilisateurs sont prévenus de tout changement important.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      path="/conditions"
      eyebrow="Règles d'usage"
      title="Conditions d'utilisation"
      updatedAt={<ToComplete>date de publication</ToComplete>}
      intro={<p>Les règles qui s&apos;appliquent aux familles, aux éducateurs et à Access, de l&apos;inscription à la fin d&apos;un tutorat.</p>}
      sections={sections}
    />
  );
}
