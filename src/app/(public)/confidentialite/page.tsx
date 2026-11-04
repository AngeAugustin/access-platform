import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ToComplete, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Politique de confidentialité" };

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    content: (
      <>
        <p>
          Les données personnelles traitées sur Access le sont par <ToComplete>raison sociale</ToComplete>, <ToComplete>forme juridique</ToComplete>, dont le siège est situé{" "}
          <ToComplete>adresse du siège</ToComplete>, immatriculée sous le numéro <ToComplete>RCCM</ToComplete> (ci-après « Access »).
        </p>
        <p>
          Ces traitements relèvent de la loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin. Ils ont été déclarés auprès de l&apos;Autorité de
          Protection des Données à caractère Personnel (APDP) sous le numéro <ToComplete>numéro de déclaration APDP</ToComplete>.
        </p>
        <p>
          Pour toute question sur vos données : <ToComplete>adresse e-mail dédiée</ToComplete>.
        </p>
      </>
    ),
  },
  {
    id: "donnees",
    title: "Données collectées",
    content: (
      <>
        <p>Nous ne collectons que les données nécessaires au service :</p>
        <ul>
          <li>
            <strong>Tous les comptes</strong> : nom, prénom, numéro personnel d&apos;identification (NPI), adresse e-mail, téléphone, ville et adresse (facultatives), mot de passe
            (conservé uniquement sous forme chiffrée), date d&apos;acceptation des conditions.
          </li>
          <li>
            <strong>Parents</strong> : pour chaque enfant inscrit, nom, prénom, sexe, date de naissance, classe et école, niveau par matière, matières préférées et centres
            d&apos;intérêt, et NPI de l&apos;enfant s&apos;il est renseigné.
          </li>
          <li>
            <strong>Éducateurs</strong> : date de naissance, situation familiale, expérience et parcours, matières et classes enseignées, zone d&apos;intervention,
            disponibilités, coordonnées de deux garants, numéro Mobile Money de reversement, et pièces justificatives : pièce d&apos;identité, casier judiciaire, diplômes,
            photo.
          </li>
          <li>
            <strong>Suivi du tutorat</strong> : tutorats, comptes rendus de séance, confirmations et contestations, avis laissés par les parents, réclamations et leurs
            réponses, notifications.
          </li>
          <li>
            <strong>Paiements</strong> : échéances, montants, statut et référence des transactions FedaPay, reversements aux éducateurs. Access ne reçoit jamais vos
            numéros de carte ni vos codes Mobile Money.
          </li>
          <li>
            <strong>Sécurité</strong> : adresse IP et navigateur des sessions, date de dernière connexion, tentatives de connexion échouées, journal des actions sensibles.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "finalites",
    title: "Finalités et bases légales",
    content: (
      <ul>
        <li>
          <strong>Fournir le service</strong> (exécution du contrat) : créer votre compte, mettre en relation familles et éducateurs, organiser les séances, en assurer le
          suivi.
        </li>
        <li>
          <strong>Vérifier les éducateurs</strong> (intérêt légitime de protéger les enfants et les familles) : contrôle de l&apos;identité, du casier judiciaire, des
          diplômes et des garants avant toute mise en relation.
        </li>
        <li>
          <strong>Encaisser et reverser les paiements</strong> (exécution du contrat, obligations comptables).
        </li>
        <li>
          <strong>Traiter les réclamations et les séances contestées</strong> (exécution du contrat).
        </li>
        <li>
          <strong>Sécuriser la plateforme</strong> (intérêt légitime) : détection des tentatives d&apos;intrusion, verrouillage des comptes après des échecs répétés,
          journal d&apos;audit.
        </li>
        <li>
          <strong>Vous informer</strong> (exécution du contrat) : e-mails et notifications liés à votre compte, à vos séances et à vos échéances. Les notifications push
          ne sont envoyées qu&apos;avec votre accord, donné depuis votre navigateur.
        </li>
      </ul>
    ),
  },
  {
    id: "enfants",
    title: "Données des enfants",
    content: (
      <p>
        Les informations sur un enfant sont saisies par son parent ou représentant légal, qui garantit être autorisé à le faire. Elles ne sont visibles que de ce parent, de
        l&apos;équipe Access et de l&apos;éducateur chargé d&apos;un tutorat de cet enfant, pendant la durée de ce tutorat. L&apos;enfant ne dispose pas de compte.
      </p>
    ),
  },
  {
    id: "destinataires",
    title: "Qui voit vos données",
    content: (
      <>
        <ul>
          <li>
            <strong>Les familles</strong> voient le profil public d&apos;un éducateur validé : nom, photo, matières, classes, zone, expérience, note et niveau attribués par
            Access, avis des parents. Ses pièces justificatives, garants et coordonnées ne leur sont jamais montrés.
          </li>
          <li>
            <strong>Tout visiteur du site</strong> voit un aperçu des éducateurs validés (prénom, initiale du nom, matières, classes, zone, niveau, note et moyenne des
            avis) et les avis publiés par les parents, signés de leur seul prénom.
          </li>
          <li>
            <strong>Un éducateur</strong> voit les informations utiles au tutorat qu&apos;il assure : l&apos;enfant, sa classe et son niveau, et les coordonnées du parent.
          </li>
          <li>
            <strong>L&apos;équipe Access</strong> accède aux données nécessaires à ses missions : validation des dossiers, suivi, paiements, réclamations, sécurité.
          </li>
          <li>
            <strong>Nos prestataires</strong>, pour le strict nécessaire : FedaPay (paiements et reversements), Resend (envoi des e-mails), les services de notification des
            navigateurs (notifications push), et <ToComplete>hébergeur</ToComplete> (hébergement de l&apos;application, de la base de données et des pièces justificatives).
          </li>
        </ul>
        <p>Vos données ne sont ni vendues ni utilisées à des fins publicitaires.</p>
      </>
    ),
  },
  {
    id: "transferts",
    title: "Transferts hors du Bénin",
    content: (
      <p>
        Certains prestataires peuvent traiter des données hors du Bénin, notamment pour l&apos;envoi des e-mails (Resend) et des notifications push. Ces transferts sont
        limités aux données nécessaires (adresse e-mail, contenu du message) et encadrés conformément au Code du numérique. <ToComplete>Pays d&apos;hébergement et garanties
        retenues</ToComplete>.
      </p>
    ),
  },
  {
    id: "conservation",
    title: "Durées de conservation",
    content: (
      <ul>
        <li>
          Données du compte et du suivi : pendant la vie du compte, puis <ToComplete>durée, par ex. 3 ans après la dernière activité</ToComplete>.
        </li>
        <li>
          Pièces justificatives d&apos;un éducateur : pendant la vie du compte, puis <ToComplete>durée, par ex. 1 an après la fermeture</ToComplete>.
        </li>
        <li>
          Données de paiement : <ToComplete>durée légale de conservation des pièces comptables</ToComplete>.
        </li>
        <li>Sessions de connexion : 7 jours sans activité. Codes de réinitialisation du mot de passe : 15 minutes.</li>
        <li>
          Journal de sécurité : <ToComplete>durée, par ex. 1 an</ToComplete>.
        </li>
      </ul>
    ),
  },
  {
    id: "securite",
    title: "Sécurité",
    content: (
      <ul>
        <li>Les mots de passe sont chiffrés de façon irréversible (Argon2) : personne, pas même l&apos;équipe Access, ne peut les lire.</li>
        <li>Les échanges sont chiffrés (HTTPS) et le cookie de session n&apos;est pas lisible par les scripts de la page.</li>
        <li>Après 5 tentatives de connexion échouées, le compte est verrouillé 24 heures et son titulaire est prévenu par e-mail.</li>
        <li>Les pièces justificatives sont stockées hors de l&apos;espace public du site et ne sont servies qu&apos;à leur propriétaire et à l&apos;équipe Access.</li>
        <li>Les actions sensibles (connexions, validations, paiements, gestion des comptes) sont journalisées.</li>
      </ul>
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    content: (
      <>
        <p>Conformément au Code du numérique, vous disposez d&apos;un droit :</p>
        <ul>
          <li>d&apos;accès à vos données et d&apos;en obtenir une copie ;</li>
          <li>de rectification : la plupart des informations se modifient directement depuis votre profil ;</li>
          <li>d&apos;effacement, sous réserve des données que nous devons conserver (paiements, obligations légales) ;</li>
          <li>d&apos;opposition à un traitement fondé sur notre intérêt légitime, pour un motif tenant à votre situation.</li>
        </ul>
        <p>
          Pour les exercer, déposez une réclamation depuis votre espace ou écrivez à <ToComplete>adresse e-mail dédiée</ToComplete>. Nous répondons dans un délai d&apos;un
          mois. Si notre réponse ne vous satisfait pas, vous pouvez saisir l&apos;APDP.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        Access n&apos;utilise qu&apos;un cookie, indispensable à votre connexion, et aucun traceur publicitaire ni outil de mesure d&apos;audience. Le détail figure dans la page{" "}
        <Link href="/cookies">Cookies et stockage local</Link>.
      </p>
    ),
  },
  {
    id: "modifications",
    title: "Modifications",
    content: <p>Cette politique peut évoluer avec le service. En cas de changement important, vous en serez informé par e-mail ou dans l&apos;application.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/confidentialite"
      eyebrow="Vos données"
      title="Politique de confidentialité"
      updatedAt={<ToComplete>date de publication</ToComplete>}
      intro={<p>Quelles données Access collecte, pourquoi, qui peut les voir, combien de temps nous les gardons et comment exercer vos droits.</p>}
      sections={sections}
    />
  );
}
