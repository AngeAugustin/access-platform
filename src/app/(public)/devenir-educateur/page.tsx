import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileCheck2, HandCoins, MapPin, NotebookPen, Users } from "lucide-react";
import { amountForWeeks } from "@/lib/billing";
import { DOCUMENT_TYPES, MAX_AVAILABILITIES, MAX_UPLOAD_BYTES, REQUIRED_DOCUMENTS, TIME_SLOTS } from "@/lib/constants";
import { formatFcfa } from "@/lib/format";
import { CtaBand, FaqList, FeatureCard, PageHero, pillAccent, pillLight, Section, Steps } from "@/components/marketing";
import { publicTariffs } from "@/server/queries/public";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Devenir éducateur",
  description: "Donnez des cours à domicile à Cotonou et Abomey-Calavi : des familles près de chez vous, des paiements garantis sur votre Mobile Money.",
};

export default async function BecomeEducatorPage() {
  const [tariffs, settings] = await Promise.all([publicTariffs(), getSettings()]);
  const commission = settings.commissionPercent;
  const weeks = settings.weeksPerInstallment;
  const example = tariffs[0];
  const exampleGross = example ? amountForWeeks(example, weeks) : 0;
  const exampleNet = Math.round((exampleGross * (100 - commission)) / 100);

  return (
    <>
      <PageHero
        eyebrow="Devenir éducateur"
        title="Enseignez près de chez vous. Soyez payé sans relancer personne."
        actions={
          <>
            <Link href="/inscription?role=EDUCATOR" className={pillAccent}>
              Créer mon compte éducateur
            </Link>
            <Link href="#dossier" className={pillLight}>
              Les pièces à fournir
            </Link>
          </>
        }
      >
        <p>
          Access vous présente à des familles de Cotonou et Abomey-Calavi qui cherchent un répétiteur pour leur enfant, du collège à la terminale. Vous choisissez vos
          matières, vos classes, votre zone et vos créneaux ; nous nous occupons de l&apos;encaissement.
        </p>
      </PageHero>

      <Section eyebrow="Ce que vous y gagnez" title="Concentrez-vous sur les cours.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={Users} title="Des familles qui vous trouvent" tone="dark">
            Les parents cherchent par matière, par classe et par quartier. Votre profil validé, votre note et vos avis travaillent pour vous.
          </FeatureCard>
          <FeatureCard icon={HandCoins} title="Des paiements garantis">
            Les familles paient Access en ligne ; une fois l&apos;échéance réglée, Access vous reverse votre part sur votre Mobile Money. Plus de relances.
          </FeatureCard>
          <FeatureCard icon={CalendarClock} title="Votre emploi du temps protégé" tone="warm">
            Jusqu&apos;à {MAX_AVAILABILITIES} créneaux de 3 heures par semaine. Un créneau réservé ne peut pas l&apos;être une seconde fois.
          </FeatureCard>
          <FeatureCard icon={NotebookPen} title="Un suivi simple des séances">
            Après chaque cours, vous notez le travail fait depuis votre téléphone, même sans connexion : il part dès que le réseau revient.
          </FeatureCard>
          <FeatureCard icon={MapPin} title="Près de chez vous">
            Vous indiquez votre zone d&apos;intervention : moins de trajets, plus de cours.
          </FeatureCard>
          <FeatureCard icon={FileCheck2} title="Un statut indépendant" tone="brand">
            Vous restez libre de vos créneaux et de vos matières. Access ne vous impose pas d&apos;horaires.
          </FeatureCard>
        </div>
      </Section>

      <Section eyebrow="Rémunération" title="Comment vous êtes payé.">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 rounded-[28px] bg-canvas p-8 text-[17px] leading-relaxed text-slate-600 sm:p-10">
            <p>
              Le prix d&apos;un tutorat dépend de la classe de l&apos;élève (voir les <Link href="/tarifs" className="font-semibold text-brand-700 hover:underline">tarifs</Link>
              ). Les familles paient par échéances de {weeks} semaines.
            </p>
            <p>
              Dès qu&apos;une échéance est payée, Access vous reverse son montant sur votre numéro Mobile Money, déduction faite de la commission d&apos;Access :{" "}
              <strong className="text-ink">{commission} %</strong>.
            </p>
          </div>
          {example && (
            <div className="rounded-[28px] bg-brand-600 p-8 text-white sm:p-10">
              <p className="text-sm text-brand-200">
                Exemple : un élève de {example.classLevel}, {example.sessionsPerWeek} × {example.hoursPerSession} h par semaine
              </p>
              <dl className="mt-6 space-y-3">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-brand-200">Échéance de {weeks} semaines</dt>
                  <dd className="font-semibold tabular-nums">{formatFcfa(exampleGross)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-brand-200">Commission Access ({commission} %)</dt>
                  <dd className="font-semibold tabular-nums">− {formatFcfa(exampleGross - exampleNet)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-white/15 pt-4">
                  <dt className="font-semibold">Versé sur votre Mobile Money</dt>
                  <dd className="font-display text-3xl font-extrabold tabular-nums">{formatFcfa(exampleNet)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </Section>

      <Section id="dossier" eyebrow="Votre dossier" title="Ce qu'il faut préparer." intro={<p>Fichiers PDF ou images, {MAX_UPLOAD_BYTES / 1024 / 1024} Mo maximum chacun.</p>}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ul className="space-y-2.5 rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <li className="pb-2 font-display text-xl font-bold text-ink">Pièces justificatives</li>
            {(Object.keys(DOCUMENT_TYPES) as (keyof typeof DOCUMENT_TYPES)[]).map((t) => (
              <li key={t} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 text-15px">
                <span className="text-ink">{DOCUMENT_TYPES[t]}</span>
                <span className="text-13px font-medium text-slate-500">{(REQUIRED_DOCUMENTS as readonly string[]).includes(t) ? "Obligatoire" : "Facultatif"}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2.5 rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <li className="pb-2 font-display text-xl font-bold text-ink">Informations</li>
            {[
              "Votre parcours, votre expérience et une courte présentation",
              "Les matières et les classes que vous enseignez",
              "Votre zone d'intervention",
              `Vos disponibilités (créneaux ${Object.values(TIME_SLOTS).join(", ")})`,
              "Les coordonnées de deux garants",
              "Le numéro Mobile Money qui recevra vos paiements",
            ].map((t) => (
              <li key={t} className="rounded-2xl bg-canvas px-4 py-3 text-15px text-ink">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section eyebrow="Les étapes" title="De l'inscription au premier élève.">
        <Steps
          items={[
            { title: "Créez votre compte", text: "Votre identité, votre NPI et vos coordonnées, en quelques minutes." },
            { title: "Complétez votre dossier", text: "Pièces justificatives, matières, disponibilités et garants, puis transmettez-le." },
            { title: "Validation par Access", text: "L'équipe examine le dossier et vous attribue une note et un niveau. En cas de refus, le motif vous est indiqué pour corriger." },
            { title: "Recevez vos élèves", text: "Votre profil est proposé aux familles. Vous êtes notifié à chaque nouveau tutorat." },
          ]}
        />
      </Section>

      <Section eyebrow="Questions" title="Avant de vous lancer.">
        <FaqList
          items={[
            { q: "Faut-il être enseignant de métier ?", a: "Non. Il faut un diplôme académique, un casier judiciaire et une expérience que vous décrivez dans votre dossier. L'équipe Access évalue chaque profil." },
            { q: "Combien de temps prend la validation ?", a: "Le dossier est examiné après sa transmission complète. Vous êtes notifié de la décision dans l'application et par e-mail." },
            { q: "Que se passe-t-il si une famille conteste une séance ?", a: "La séance est examinée par l'équipe Access, qui la confirme ou la retire. Noter chaque séance avec précision vous protège." },
            { q: "Suis-je salarié d'Access ?", a: "Non. Vous exercez en indépendant et restez responsable de vos obligations fiscales et sociales." },
          ]}
        />
      </Section>

      <CtaBand title="Votre prochain élève vous attend.">
        <Link href="/inscription?role=EDUCATOR" className="inline-flex h-14 items-center justify-center rounded-full bg-brand-600 px-7 font-semibold text-white transition hover:bg-brand-700">
          Créer mon compte éducateur
        </Link>
      </CtaBand>
    </>
  );
}
