import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import { ToComplete } from "@/components/legal-page";
import { IconBox, PageHero, Section } from "@/components/marketing";
import { ContactForm } from "@/components/public/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Une question sur Access ? Écrivez à l'équipe.",
};

export default function ContactPage() {
  const channels = [
    { icon: Mail, title: "E-mail", value: <ToComplete>adresse e-mail de contact</ToComplete> },
    { icon: MessageCircle, title: "Téléphone et WhatsApp", value: <ToComplete>numéro</ToComplete> },
    { icon: Clock, title: "Horaires", value: <ToComplete>jours et heures d&apos;ouverture du support</ToComplete> },
    { icon: MapPin, title: "Adresse", value: <ToComplete>adresse</ToComplete> },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Une question ? Écrivez-nous.">
        <p>
          Vous avez déjà un compte ? Le plus rapide est de déposer une réclamation depuis votre espace : elle est suivie jusqu&apos;à sa résolution. Consultez aussi
          l&apos;<Link href="/aide" className="font-semibold text-brand-700 hover:underline">aide</Link>.
        </p>
      </PageHero>

      <Section>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[32px] bg-white p-7 shadow-[0_0_0_1px_rgb(15_23_42/0.07)] sm:p-10">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">Envoyer un message</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {channels.map((c) => (
              <li key={c.title} className="flex items-start gap-4 rounded-[28px] bg-canvas p-6">
                <IconBox icon={c.icon} className="bg-white text-brand-600" />
                <div>
                  <p className="font-semibold text-ink">{c.title}</p>
                  <p className="mt-1 text-slate-600">{c.value}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
