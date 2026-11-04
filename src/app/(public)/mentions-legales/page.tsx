import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ToComplete, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Mentions légales" };

const sections: LegalSection[] = [
  {
    id: "editeur",
    title: "Éditeur",
    content: (
      <ul>
        <li>
          <strong>Raison sociale</strong> : <ToComplete>raison sociale et forme juridique</ToComplete>
        </li>
        <li>
          <strong>Siège</strong> : <ToComplete>adresse complète</ToComplete>
        </li>
        <li>
          <strong>RCCM</strong> : <ToComplete>numéro d&apos;immatriculation</ToComplete>
        </li>
        <li>
          <strong>IFU</strong> : <ToComplete>identifiant fiscal unique</ToComplete>
        </li>
        <li>
          <strong>Contact</strong> : <ToComplete>e-mail</ToComplete> · <ToComplete>téléphone</ToComplete>
        </li>
        <li>
          <strong>Directeur de la publication</strong> : <ToComplete>nom et fonction</ToComplete>
        </li>
      </ul>
    ),
  },
  {
    id: "hebergement",
    title: "Hébergement",
    content: (
      <p>
        L&apos;application et ses données sont hébergées par <ToComplete>nom de l&apos;hébergeur</ToComplete>, <ToComplete>adresse de l&apos;hébergeur</ToComplete>.
      </p>
    ),
  },
  {
    id: "prestataires",
    title: "Prestataires",
    content: (
      <ul>
        <li>
          <strong>Paiements et reversements</strong> : FedaPay.
        </li>
        <li>
          <strong>Envoi des e-mails</strong> : Resend.
        </li>
      </ul>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    content: (
      <p>
        Le traitement de vos données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>. Déclaration auprès de l&apos;APDP :{" "}
        <ToComplete>numéro de déclaration</ToComplete>.
      </p>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    content: (
      <p>
        Le nom Access, son logo, les textes et l&apos;interface de la plateforme sont la propriété de l&apos;éditeur. Toute reproduction sans autorisation est interdite.
        Les contenus déposés par les utilisateurs (comptes rendus, avis, photos) restent leur propriété ; ils accordent à Access le droit de les afficher sur la plateforme
        pour les besoins du service.
      </p>
    ),
  },
];

export default function LegalNoticePage() {
  return (
    <LegalPage
      path="/mentions-legales"
      eyebrow="Informations légales"
      title="Mentions légales"
      updatedAt={<ToComplete>date de publication</ToComplete>}
      intro={<p>Qui édite et héberge Access, et comment nous joindre.</p>}
      sections={sections}
    />
  );
}
