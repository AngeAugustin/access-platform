import type { Metadata } from "next";
import { LegalPage, ToComplete, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Cookies et stockage local" };

const rows = [
  { name: "access_session", kind: "Cookie", purpose: "Vous garder connecté. Il ne contient qu'un jeton aléatoire, illisible par les scripts de la page.", duration: "7 jours, prolongés à l'usage ; supprimé à la déconnexion" },
  { name: "Cache des pages", kind: "Cache de l'application", purpose: "Afficher les pages déjà consultées sans connexion internet.", duration: "Vidé à la déconnexion" },
  { name: "access-lesson-queue", kind: "Stockage local", purpose: "Garder un compte rendu de séance saisi hors connexion jusqu'à son envoi (éducateurs).", duration: "Jusqu'à l'envoi" },
  { name: "access-install-dismissed", kind: "Stockage local", purpose: "Ne plus afficher la suggestion d'installer l'application une fois refusée.", duration: "Jusqu'à effacement par le navigateur" },
  { name: "access:nav-collapsed", kind: "Stockage local", purpose: "Mémoriser les rubriques repliées du menu de l'administration.", duration: "Jusqu'à effacement par le navigateur" },
];

const sections: LegalSection[] = [
  {
    id: "principe",
    title: "Le principe",
    content: (
      <p>
        Access n&apos;utilise que ce qui est indispensable au fonctionnement du service : aucun cookie publicitaire, aucun outil de mesure d&apos;audience, aucun traceur de
        réseau social. Ces éléments étant strictement nécessaires, ils ne demandent pas votre consentement préalable, et aucun bandeau ne vous est donc affiché.
      </p>
    ),
  },
  {
    id: "liste",
    title: "Ce que nous enregistrons",
    content: (
      <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-13px text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Nom</th>
              <th scope="col" className="px-4 py-3 font-semibold">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">Rôle</th>
              <th scope="col" className="px-4 py-3 font-semibold">Durée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.name} className="align-top">
                <td className="px-4 py-3 font-mono text-13px text-ink">{r.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.kind}</td>
                <td className="px-4 py-3">{r.purpose}</td>
                <td className="px-4 py-3">{r.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "notifications",
    title: "Notifications push",
    content: (
      <p>
        Si vous les activez, votre navigateur nous transmet une adresse d&apos;abonnement qui permet de vous envoyer des notifications. Vous pouvez les désactiver à tout
        moment dans les réglages de votre navigateur ou de votre téléphone.
      </p>
    ),
  },
  {
    id: "paiement",
    title: "Page de paiement",
    content: (
      <p>
        Le paiement s&apos;effectue sur la page sécurisée de FedaPay, qui peut déposer ses propres cookies, nécessaires à la transaction et à la prévention de la fraude.
        Ils relèvent de la politique de FedaPay. <ToComplete>Lien vers la politique de FedaPay</ToComplete>.
      </p>
    ),
  },
  {
    id: "effacer",
    title: "Les effacer",
    content: (
      <p>
        Vous pouvez effacer ces données depuis les réglages de votre navigateur (« Effacer les données de navigation »). Supprimer le cookie de session vous déconnecte ;
        effacer le stockage local fait perdre un compte rendu hors ligne qui n&apos;aurait pas encore été envoyé.
      </p>
    ),
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      path="/cookies"
      eyebrow="Votre navigateur"
      title="Cookies et stockage local"
      updatedAt={<ToComplete>date de publication</ToComplete>}
      intro={<p>Un seul cookie, pour vous garder connecté. Rien pour la publicité ni pour suivre votre navigation.</p>}
      sections={sections}
    />
  );
}
