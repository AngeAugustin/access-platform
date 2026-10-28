import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-14 text-[15px] leading-relaxed text-slate-600 sm:px-6 sm:py-20 [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Conditions d&apos;utilisation</h1>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Texte de base à faire valider par un conseil juridique avant la mise en production.</p>
      <h2>1. Objet</h2>
      <p>Access met en relation des parents d&apos;élèves et des éducateurs indépendants pour du tutorat scolaire à domicile, et assure le suivi des séances et l&apos;encaissement des paiements.</p>
      <h2>2. Comptes</h2>
      <p>Chaque utilisateur fournit des informations exactes (identité, NPI, coordonnées) et garde son mot de passe confidentiel. Access peut suspendre un compte en cas d&apos;usage frauduleux ou de manquement à ces conditions.</p>
      <h2>3. Éducateurs</h2>
      <p>Un éducateur n&apos;est proposé aux familles qu&apos;après vérification de son dossier : pièce d&apos;identité, casier judiciaire, diplômes et deux garants. Il s&apos;engage à respecter les créneaux convenus et à saisir fidèlement chaque séance.</p>
      <h2>4. Tarifs et paiements</h2>
      <p>Le coût d&apos;un tutorat découle de la grille tarifaire par classe en vigueur à sa création. Il est réglé par échéances couvrant chacune une période de quelques semaines, via FedaPay (Mobile Money ou carte). Access reverse à l&apos;éducateur le montant de chaque échéance payée, déduction faite de sa commission.</p>
      <h2>5. Arrêt d&apos;un tutorat</h2>
      <p>Le parent peut arrêter un tutorat à tout moment. La période en cours est due au prorata des semaines entamées ; les échéances suivantes sont annulées. Les sommes payées pour des semaines non effectuées font l&apos;objet d&apos;un examen par Access.</p>
      <h2>6. Réclamations</h2>
      <p>Toute réclamation se dépose depuis l&apos;application. Access s&apos;engage à y répondre dans un délai raisonnable.</p>
    </article>
  );
}
