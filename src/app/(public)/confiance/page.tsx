import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, KeyRound, LockKeyhole, MessageSquareWarning, ShieldCheck, Wallet } from "lucide-react";
import { CtaBand, dots, FeatureCard, PageHero, pillDark, pillLight, Section, Steps } from "@/components/marketing";
import { cx } from "@/components/ui";

export const metadata: Metadata = {
  title: "Confiance et sécurité",
  description: "Comment Access vérifie les éducateurs, suit chaque séance, protège les paiements et vos données.",
};

const checks = [
  { title: "Pièce d'identité", text: "L'identité et le NPI de l'éducateur sont contrôlés." },
  { title: "Casier judiciaire", text: "Un extrait est exigé avant toute mise en relation avec un enfant." },
  { title: "Diplômes", text: "Le diplôme académique, et le diplôme professionnel s'il en a un, sont vérifiés." },
  { title: "Deux garants", text: "Deux personnes de référence, joignables, se portent garantes de l'éducateur." },
];

export default function TrustPage() {
  return (
    <>
      <PageHero
        eyebrow="Confiance et sécurité"
        title="Vous confiez votre enfant. Nous prenons ça au sérieux."
        actions={
          <>
            <Link href="/inscription?role=PARENT" className={pillDark}>
              Inscrire mon enfant
            </Link>
            <Link href="/nos-educateurs" className={pillLight}>
              Voir nos éducateurs
            </Link>
          </>
        }
      >
        <p>Vérification de chaque éducateur, suivi de chaque séance, paiements protégés et données sécurisées : voici concrètement ce que fait Access.</p>
      </PageHero>

      <Section eyebrow="1. Avant la première séance" title="Chaque dossier est vérifié par une personne.">
        <div className={cx("relative overflow-hidden rounded-[40px] bg-brand-600 p-8 text-white sm:p-12")}>
          <div className={cx("absolute inset-0 opacity-50", dots)} aria-hidden />
          <ul className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.title} className="rounded-3xl bg-white/[0.07] p-6">
                <p className="flex items-center gap-2.5 font-display text-xl font-bold">
                  <ShieldCheck className="size-6 text-accent-400" strokeWidth={1.8} aria-hidden />
                  {c.title}
                </p>
                <p className="mt-2 leading-relaxed text-brand-200">{c.text}</p>
              </li>
            ))}
          </ul>
          <p className="relative mt-8 max-w-3xl leading-relaxed text-brand-100">
            Un dossier incomplet ne peut pas être transmis. Une fois validé, l&apos;éducateur reçoit une note et un niveau attribués par l&apos;équipe Access, visibles des
            familles. Un dossier refusé l&apos;est avec un motif, et l&apos;éducateur n&apos;est pas proposé tant qu&apos;il n&apos;a pas été corrigé et revalidé.
          </p>
        </div>
      </Section>

      <Section eyebrow="2. Pendant le tutorat" title="Chaque séance laisse une trace.">
        <Steps
          items={[
            { title: "L'éducateur saisit la séance", text: "Date, créneau, travail réalisé et observations, juste après le cours." },
            { title: "Vous êtes notifié", text: "Le compte rendu arrive sur votre téléphone." },
            { title: "Vous confirmez ou contestez", text: "En un geste, avec un commentaire si besoin." },
            { title: "Access tranche", text: "Une séance contestée est examinée par l'équipe, qui la confirme ou la retire." },
          ]}
        />
      </Section>

      <Section eyebrow="3. Toujours" title="Paiements, comptes et données protégés.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={Wallet} title="Paiements via FedaPay" tone="warm">
            Le paiement se fait sur la page sécurisée de FedaPay. Access ne voit jamais vos numéros de carte ni vos codes Mobile Money, et l&apos;éducateur n&apos;est payé que
            par Access.
          </FeatureCard>
          <FeatureCard icon={KeyRound} title="Mots de passe chiffrés">
            Ils sont chiffrés de façon irréversible : personne, pas même notre équipe, ne peut les lire.
          </FeatureCard>
          <FeatureCard icon={LockKeyhole} title="Comptes protégés" tone="dark">
            Après 5 tentatives de connexion échouées, le compte est verrouillé 24 heures et son titulaire prévenu par e-mail. Une vérification anti-robot bloque les
            tentatives automatisées.
          </FeatureCard>
          <FeatureCard icon={ShieldCheck} title="Pièces confidentielles">
            Les pièces justificatives des éducateurs ne sont visibles que d&apos;eux-mêmes et de l&apos;équipe Access. Les familles ne voient que le profil et la photo.
          </FeatureCard>
          <FeatureCard icon={ClipboardCheck} title="Actions journalisées" tone="brand">
            Validations, paiements, connexions et gestion des comptes sont enregistrés dans un journal d&apos;audit.
          </FeatureCard>
          <FeatureCard icon={MessageSquareWarning} title="Un recours à tout moment">
            Une réclamation se dépose depuis l&apos;application ; l&apos;équipe peut suspendre un compte sans attendre en cas de problème grave.
          </FeatureCard>
        </div>
        <p className="mt-8 text-slate-600">
          Le détail du traitement de vos données figure dans notre <Link href="/confidentialite" className="font-semibold text-brand-700 hover:underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <CtaBand title="Un éducateur vérifié, un suivi à chaque séance." />
    </>
  );
}
