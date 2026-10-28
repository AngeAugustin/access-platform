import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Politique de confidentialité</h1>
      <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Texte de base à aligner sur le Code du numérique du Bénin et à déclarer auprès de l&apos;APDP avant la mise en production.</p>
      <h2 className="text-lg font-semibold text-slate-900">Données collectées</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Parents : identité, NPI, coordonnées, informations scolaires des enfants.</li>
        <li>Éducateurs : identité, NPI, coordonnées, parcours, garants, pièces justificatives (pièce d&apos;identité, casier judiciaire, diplômes, photo), numéro Mobile Money.</li>
        <li>Suivi : séances, paiements, réclamations, journaux de sécurité (adresse IP, date de connexion).</li>
      </ul>
      <h2 className="text-lg font-semibold text-slate-900">Finalités</h2>
      <p>Vérifier les éducateurs, organiser les tutorats, facturer et reverser les paiements, traiter les réclamations, assurer la sécurité du service.</p>
      <h2 className="text-lg font-semibold text-slate-900">Protection</h2>
      <p>Les mots de passe sont chiffrés de façon irréversible (Argon2). Les pièces justificatives ne sont accessibles qu&apos;à leur propriétaire et à l&apos;équipe Access ; seule la photo d&apos;un éducateur vérifié est visible des familles. Les paiements sont traités par FedaPay : Access ne voit jamais vos données de carte ou de compte Mobile Money.</p>
      <h2 className="text-lg font-semibold text-slate-900">Vos droits</h2>
      <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en déposant une réclamation depuis l&apos;application.</p>
    </article>
  );
}
