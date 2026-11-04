import type { Metadata } from "next";
import Link from "next/link";
import { Eye, HeartHandshake, MapPin, Smartphone } from "lucide-react";
import { ToComplete } from "@/components/legal-page";
import { CtaBand, FeatureCard, PageHero, pillLight, Section } from "@/components/marketing";

export const metadata: Metadata = {
  title: "À propos",
  description: "Access rend l'accompagnement scolaire à domicile plus sûr et plus simple pour les familles et les éducateurs du Bénin.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="À propos"
        title="Rendre le bon répétiteur accessible à chaque famille."
        actions={
          <Link href="/contact" className={pillLight}>
            Nous contacter
          </Link>
        }
      >
        <p>
          Trouver un répétiteur de confiance passe souvent par le bouche-à-oreille, sans savoir qui vient vraiment chez soi ni ce qui est fait pendant les séances. Access
          est né pour changer ça : des éducateurs vérifiés, un suivi de chaque séance et un paiement simple, depuis le téléphone.
        </p>
      </PageHero>

      <Section eyebrow="Nos principes" title="Ce qui guide chaque décision.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={HeartHandshake} title="La confiance d'abord" tone="dark">
            Aucun éducateur n&apos;entre chez une famille sans dossier vérifié par notre équipe.
          </FeatureCard>
          <FeatureCard icon={Eye} title="La transparence">
            Un prix connu d&apos;avance, un compte rendu après chaque séance, des avis réels.
          </FeatureCard>
          <FeatureCard icon={Smartphone} title="La simplicité" tone="warm">
            Tout se fait depuis le téléphone, et le paiement en Mobile Money.
          </FeatureCard>
          <FeatureCard icon={MapPin} title="La proximité" tone="brand">
            Un service pensé pour le Bénin : les classes, les matières et les moyens de paiement d&apos;ici, dans toutes les communes du pays.
          </FeatureCard>
        </div>
      </Section>

      <Section eyebrow="Notre histoire" title="D'où vient Access.">
        <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-slate-600">
          <p>
            <ToComplete>Histoire du projet : qui l&apos;a lancé, quand, et pourquoi</ToComplete>
          </p>
        </div>
      </Section>

      <Section eyebrow="L'équipe" title="Les personnes derrière Access.">
        <p className="max-w-3xl text-[17px] leading-relaxed text-slate-600">
          <ToComplete>Membres de l&apos;équipe : nom, rôle et photo de chacun</ToComplete>
        </p>
      </Section>

      <CtaBand title="Rejoignez les familles et les éducateurs Access." />
    </>
  );
}
