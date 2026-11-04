import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftRight, BellRing, Camera, HandCoins, ListChecks, MapPin } from "lucide-react";
import { DOCUMENT_TYPES, MAX_UPLOAD_BYTES, TUTOR_REQUIRED_DOCUMENTS } from "@/lib/constants";
import { formatFcfa } from "@/lib/format";
import { followUpPrice, tutorShare } from "@/lib/follow-up";
import { CtaBand, FaqList, FeatureCard, PageHero, pillAccent, pillLight, Section, Steps } from "@/components/marketing";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Devenir tuteur",
  description: "Assurez le suivi quotidien d'enfants près de chez vous, partout au Bénin : leçons, devoirs, visites à l'école. Un forfait mensuel par famille.",
};

export default async function BecomeTutorPage() {
  const settings = await getSettings();
  const commission = settings.followUpCommissionPercent;
  const oneChild = followUpPrice(1, settings);
  const twoChildren = followUpPrice(2, settings);

  return (
    <>
      <PageHero
        eyebrow="Devenir tuteur"
        title="Veillez sur les devoirs des enfants, près de chez vous."
        actions={
          <>
            <Link href="/inscription?role=TUTOR" className={pillAccent}>
              Créer mon compte tuteur
            </Link>
            <Link href="#dossier" className={pillLight}>
              Les pièces à fournir
            </Link>
          </>
        }
      >
        <p>
          Partout au Bénin, des parents cherchent quelqu&apos;un de confiance pour s&apos;assurer, chaque jour, que leurs enfants ont appris leurs leçons et fait leurs
          devoirs, et pour passer à l&apos;école consulter les notes. Le parent fixe les actions ; vous les faites et lui en rendez compte depuis votre téléphone.
        </p>
      </PageHero>

      <Section eyebrow="Le rôle" title="Ce que vous faites pour les familles.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={ListChecks} title="Des actions claires" tone="dark">
            Chaque famille définit ses actions : quels enfants, quels jours, avant quelle heure. L&apos;écran « Aujourd&apos;hui » vous dit exactement quoi faire.
          </FeatureCard>
          <FeatureCard icon={Camera} title="Un retour par action">
            Fait, en partie ou non fait, avec un commentaire, des photos des cahiers et les notes relevées à l&apos;école. Le parent le reçoit aussitôt.
          </FeatureCard>
          <FeatureCard icon={MapPin} title="Près de chez vous" tone="warm">
            Vous indiquez votre zone : les familles du quartier vous trouvent dans le catalogue Access.
          </FeatureCard>
          <FeatureCard icon={HandCoins} title="Un forfait par famille">
            Le prix est fixé par Access, sans négociation. Vous voyez votre part avant d&apos;accepter chaque demande.
          </FeatureCard>
          <FeatureCard icon={BellRing} title="Vous choisissez vos familles" tone="brand">
            Chaque demande arrive avec les enfants, l&apos;adresse et les actions souhaitées. Vous acceptez ou déclinez en indiquant pourquoi.
          </FeatureCard>
          <FeatureCard icon={ArrowLeftRight} title="Aussi pour les éducateurs">
            Vous donnez déjà des cours sur Access ? Activez l&apos;espace tuteur depuis votre compte : votre dossier est repris et vous passez d&apos;un espace à l&apos;autre.
          </FeatureCard>
        </div>
      </Section>

      <Section eyebrow="Rémunération" title="Ce que vous recevez.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 rounded-[28px] bg-canvas p-8 text-[17px] leading-relaxed text-slate-600 sm:p-10">
            <p>
              La famille paie un forfait mensuel à Access : {formatFcfa(settings.followUpFirstChild)} pour le premier enfant, puis {formatFcfa(settings.followUpExtraChild)} par
              enfant supplémentaire. Le forfait ne change pas avec le nombre d&apos;actions.
            </p>
            <p>
              Access vous reverse ce forfait sur votre numéro Mobile Money, déduction faite de sa commission : <strong className="text-ink">{commission} %</strong>.
            </p>
          </div>
          <div className="rounded-[28px] bg-brand-600 p-8 text-white sm:p-10">
            <p className="text-sm text-brand-200">Votre part, chaque mois</p>
            <dl className="mt-6 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-brand-200">Une famille, 1 enfant</dt>
                <dd className="font-semibold tabular-nums">{formatFcfa(tutorShare(oneChild, commission))}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-brand-200">Une famille, 2 enfants</dt>
                <dd className="font-semibold tabular-nums">{formatFcfa(tutorShare(twoChildren, commission))}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-white/15 pt-4">
                <dt className="font-semibold">Trois familles de 2 enfants</dt>
                <dd className="font-display text-3xl font-extrabold tabular-nums">{formatFcfa(3 * tutorShare(twoChildren, commission))}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      <Section id="dossier" eyebrow="Votre dossier" title="Ce qu'il faut préparer." intro={<p>Fichiers PDF ou images, {MAX_UPLOAD_BYTES / 1024 / 1024} Mo maximum chacun.</p>}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ul className="space-y-2.5 rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <li className="pb-2 font-display text-xl font-bold text-ink">Pièces justificatives</li>
            {TUTOR_REQUIRED_DOCUMENTS.map((t) => (
              <li key={t} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 text-15px">
                <span className="text-ink">{DOCUMENT_TYPES[t]}</span>
                <span className="text-13px font-medium text-slate-500">Obligatoire</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5 rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <li className="pb-2 font-display text-xl font-bold text-ink">Informations</li>
            {["Votre date de naissance et votre situation actuelle", "Votre zone d'intervention", "Une courte présentation pour les familles", "Les coordonnées d'un garant", "Le numéro Mobile Money qui recevra vos paiements"].map((t) => (
              <li key={t} className="rounded-2xl bg-canvas px-4 py-3 text-15px text-ink">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section eyebrow="Les étapes" title="De l'inscription à la première famille.">
        <Steps
          items={[
            { title: "Créez votre compte", text: "Votre identité, votre NPI et vos coordonnées, en quelques minutes." },
            { title: "Complétez votre dossier", text: "Pièces justificatives, zone, garant et Mobile Money, puis transmettez-le." },
            { title: "Validation par Access", text: "L'équipe examine le dossier. En cas de refus, le motif vous est indiqué pour corriger." },
            { title: "Recevez des demandes", text: "Votre profil est proposé aux familles. Vous êtes notifié à chaque nouvelle demande de suivi." },
          ]}
        />
      </Section>

      <Section eyebrow="Questions" title="Avant de vous lancer.">
        <FaqList
          items={[
            { q: "Faut-il un diplôme ?", a: "Non. Le tuteur ne donne pas de cours : il veille à ce que le travail soit fait. Une pièce d'identité, un casier judiciaire et un garant sont exigés." },
            {
              q: "Que se passe-t-il si je ne peux pas faire une action ?",
              a: "Faites quand même le retour en indiquant « non fait » et la raison. Une action sans retour dans les délais est signalée au parent et compte dans votre fiabilité, visible des familles.",
            },
            { q: "Puis-je arrêter un suivi ?", a: "Oui, à tout moment, en indiquant un motif. Le parent est prévenu et les actions à venir sont retirées." },
            { q: "Suis-je salarié d'Access ?", a: "Non. Vous exercez en indépendant et restez responsable de vos obligations fiscales et sociales." },
          ]}
        />
      </Section>

      <CtaBand title="Des familles comptent sur vous.">
        <Link href="/inscription?role=TUTOR" className="inline-flex h-14 items-center justify-center rounded-full bg-brand-600 px-7 font-semibold text-white transition hover:bg-brand-700">
          Créer mon compte tuteur
        </Link>
      </CtaBand>
    </>
  );
}
