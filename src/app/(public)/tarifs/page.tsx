import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CalendarRange, CircleSlash, Wallet } from "lucide-react";
import { amountForWeeks } from "@/lib/billing";
import { formatFcfa } from "@/lib/format";
import { followUpPrice } from "@/lib/follow-up";
import { CtaBand, EmptyNote, FaqList, FeatureCard, PageHero, pillDark, Section } from "@/components/marketing";
import { PriceSimulator } from "@/components/public/price-simulator";
import { publicTariffs } from "@/server/queries/public";
import { getSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Le prix de l'accompagnement à domicile par classe, et le forfait mensuel du suivi au quotidien par un tuteur.",
};

export default async function PricingPage() {
  const [tariffs, settings] = await Promise.all([publicTariffs(), getSettings()]);
  const perInstallment = settings.weeksPerInstallment;

  return (
    <>
      <PageHero
        eyebrow="Tarifs"
        title="Un prix clair, connu avant de vous engager."
        actions={
          <Link href="/inscription?role=PARENT" className={pillDark}>
            Inscrire mon enfant
          </Link>
        }
      >
        <p>
          Le tarif dépend uniquement de la classe de votre enfant. Il est fixé au moment où vous créez l&apos;accompagnement et ne change plus ensuite. Vous payez au fil de l&apos;eau,
          par échéances de {perInstallment} semaines.
        </p>
      </PageHero>

      <Section eyebrow="Simulateur" title="Estimez le coût d'un accompagnement.">
        {tariffs.length ? (
          <PriceSimulator tariffs={tariffs} weeksPerInstallment={perInstallment} maxWeeks={settings.maxDurationWeeks} />
        ) : (
          <EmptyNote>La grille tarifaire est en cours de mise à jour. Revenez bientôt.</EmptyNote>
        )}
      </Section>

      {tariffs.length > 0 && (
        <Section eyebrow="Grille" title="Le tarif de chaque classe.">
          <div className="overflow-x-auto rounded-[28px] ring-1 ring-slate-200">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-canvas text-13px text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Classe</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Rythme</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold">Tarif horaire</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold">Par semaine</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold">Par échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-15px">
                {tariffs.map((t) => (
                  <tr key={t.classLevel}>
                    <th scope="row" className="px-6 py-4 font-semibold text-ink">
                      {t.classLevel}
                    </th>
                    <td className="px-6 py-4 text-slate-600">
                      {t.sessionsPerWeek} × {t.hoursPerSession} h
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{formatFcfa(t.hourlyRate)}</td>
                    <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{formatFcfa(amountForWeeks(t, 1))}</td>
                    <td className="px-6 py-4 text-right font-semibold text-ink tabular-nums">{formatFcfa(amountForWeeks(t, perInstallment))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section
        id="suivi"
        eyebrow="Le suivi au quotidien"
        title="Un forfait mensuel, quel que soit le nombre d'actions."
        intro={
          <p>
            Leçons du soir, devoirs, visites à l&apos;école : vous choisissez les actions confiées au tuteur. Le prix ne dépend que du nombre d&apos;enfants suivis. Il est fixé
            par Access et figé à la création du suivi.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className={n === 1 ? "rounded-[28px] bg-brand-600 p-8 text-white" : "rounded-[28px] bg-canvas p-8"}>
              <p className={n === 1 ? "text-sm text-brand-200" : "text-sm text-slate-500"}>
                {n} enfant{n > 1 ? "s" : ""} suivi{n > 1 ? "s" : ""}
              </p>
              <p className={n === 1 ? "mt-2 font-display text-4xl font-extrabold tracking-tight tabular-nums" : "mt-2 font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums"}>
                {formatFcfa(followUpPrice(n, settings))}
              </p>
              <p className={n === 1 ? "mt-1 text-sm text-brand-200" : "mt-1 text-sm text-slate-500"}>par mois</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-slate-600">
          {formatFcfa(settings.followUpFirstChild)} pour le premier enfant, puis {formatFcfa(settings.followUpExtraChild)} par enfant supplémentaire. Le suivi est indépendant des
          cours : vous pouvez prendre l&apos;un, l&apos;autre ou les deux.{" "}
          <Link href="/fonctionnement#suivi" className="font-semibold text-brand-700 hover:underline">
            Comment fonctionne le suivi
          </Link>
        </p>
      </Section>

      <Section eyebrow="Paiement" title="Comment vous payez les cours.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={CalendarRange} title={`Par échéances de ${perInstallment} semaines`}>
            Chaque échéance couvre une période et se règle à la fin de celle-ci. Jamais tout l&apos;accompagnement d&apos;avance.
          </FeatureCard>
          <FeatureCard icon={Wallet} title="En Mobile Money ou par carte" tone="warm">
            MTN MoMo, Moov Money ou carte bancaire, sur la page sécurisée de FedaPay.
          </FeatureCard>
          <FeatureCard icon={BellRing} title="Avec un rappel">
            Vous êtes prévenu avant chaque échéance, par notification et par e-mail.
          </FeatureCard>
          <FeatureCard icon={CircleSlash} title="Sans engagement caché" tone="dark">
            Vous pouvez arrêter à tout moment : la période en cours est due au prorata, les suivantes sont annulées.
          </FeatureCard>
        </div>
      </Section>

      <Section eyebrow="Questions" title="Sur les tarifs.">
        <FaqList
          items={[
            {
              q: "Le prix change-t-il en cours d'année ?",
              a: "Non. Le tarif de la classe est figé à la création de l'accompagnement. Une nouvelle grille ne s'applique qu'aux accompagnements créés ensuite.",
            },
            {
              q: "Que se passe-t-il si j'arrête l'accompagnement ?",
              a: "La période en cours est recalculée au prorata des semaines entamées, et vous avez une semaine pour la régler. Les échéances suivantes sont annulées. Les sommes déjà payées pour des semaines non effectuées sont examinées par l'équipe Access.",
            },
            {
              q: "Le forfait du suivi change-t-il si j'ajoute des actions ?",
              a: "Non. Le forfait dépend uniquement du nombre d'enfants suivis. Vous pouvez ajouter, modifier ou retirer des actions sans changer le prix.",
            },
            {
              q: "Y a-t-il des frais d'inscription ?",
              a: "Non. La création du compte et l'inscription de vos enfants sont gratuites. Vous ne payez que les échéances de vos accompagnements.",
            },
            {
              q: "L'éducateur peut-il me demander de le payer directement ?",
              a: (
                <>
                  Non. Tous les paiements passent par Access, ce qui vous protège en cas de séance contestée. Signalez toute demande de ce type depuis l&apos;application ou
                  via la page <Link href="/contact">Contact</Link>.
                </>
              ),
            },
          ]}
        />
      </Section>

      <CtaBand title="Prêt à trouver le bon éducateur ?" />
    </>
  );
}
