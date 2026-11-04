import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Check, ClipboardCheck, Plus, ShieldCheck, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import { CtaBand, dots, eyebrow, IconBox, pill, pillDark, pillLight, sectionTitle } from "@/components/marketing";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/constants";
import { cx } from "@/components/ui";

// Moyens de paiement proposés par FedaPay ; dimensions réelles des fichiers (hauteur affichée fixée en CSS).
const PAYMENT_LOGOS = [
  { src: "/images/paiement/mtn-momo.png", alt: "MTN MoMo", width: 256, height: 112 },
  { src: "/images/paiement/moov-money.png", alt: "Moov Money", width: 123, height: 112 },
  { src: "/images/paiement/celtiis-cash.png", alt: "Celtiis Cash", width: 381, height: 99 },
  { src: "/images/paiement/carte-bancaire.png", alt: "Carte bancaire", width: 172, height: 112 },
];

const steps = [
  { title: "Inscrivez votre enfant", text: "Sa classe, son école et son niveau dans chaque matière, en deux minutes." },
  { title: "Choisissez un éducateur", text: "Filtrez par matière et par quartier parmi des profils vérifiés et notés." },
  { title: "Suivez chaque séance", text: "L'éducateur décrit le travail fait, vous confirmez depuis votre téléphone." },
  { title: "Payez en Mobile Money", text: "Une échéance toutes les quatre semaines, réglée en quelques secondes." },
];

const checks = [
  { label: "Pièce d'identité", status: "Vérifiée" },
  { label: "Casier judiciaire", status: "Vérifié" },
  { label: "Diplômes", status: "Vérifiés" },
  { label: "Deux garants", status: "Renseignés" },
];

const educatorPoints = [
  "Des familles qui vous trouvent par matière et par quartier",
  "Vos disponibilités protégées contre les doubles réservations",
  "Vos revenus versés sur votre Mobile Money",
  "Un suivi clair de vos élèves et de vos séances",
];

// Aperçu d'une grille de disponibilités : true = créneau ouvert.
const slots = [true, false, true, true, false, false, true, false, true, false];

const faq = [
  {
    q: "Comment les éducateurs sont-ils vérifiés ?",
    a: "Chaque éducateur transmet sa pièce d'identité, son casier judiciaire, ses diplômes et deux garants. L'équipe Access examine le dossier avant de le valider et lui attribue une note et un niveau.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Le tutorat est réglé par échéances de quatre semaines, en ligne, par MTN MoMo, Moov Money ou carte. Vous recevez un rappel avant chaque échéance.",
  },
  {
    q: "Et si une séance ne s'est pas bien passée ?",
    a: "Après chaque séance, vous confirmez ou contestez le compte rendu de l'éducateur. Une séance contestée est examinée par l'équipe Access.",
  },
  { q: "Dans quelles villes Access est-il disponible ?", a: "Access est disponible à Cotonou et Abomey-Calavi." },
];

function MoreLink({ href, children, tone = "dark" }: { href: string; children: React.ReactNode; tone?: "dark" | "light" }) {
  return (
    <Link href={href} className={cx("mt-5 inline-flex items-center gap-1.5 text-15px font-semibold underline-offset-4 hover:underline", tone === "light" ? "text-white" : "text-brand-700")}>
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function FloatingChip({ icon, iconClass, title, text, className }: { icon: LucideIcon; iconClass: string; title: string; text: string; className: string }) {
  const Icon = icon;
  return (
    <div className={cx("absolute hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-18px_rgb(0_74_173/0.45)] sm:flex", className)}>
      <span className={cx("flex size-9 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="relative flex justify-center py-6" aria-hidden>
      <div className={cx("absolute inset-y-0 right-0 left-10 rounded-[40px] bg-brand-600", dots)} />
      <svg viewBox="0 0 400 400" className="absolute -top-10 -right-16 size-90 opacity-50">
        <circle cx="200" cy="200" r="120" fill="none" stroke="white" strokeOpacity="0.25" />
        <circle cx="200" cy="200" r="170" fill="none" stroke="white" strokeOpacity="0.15" />
      </svg>

      <div className="relative w-[300px] rounded-[48px] bg-[#0b1225] p-2.5 shadow-[0_40px_80px_-30px_rgb(0_74_173/0.7)]">
        <div className="flex flex-col gap-3 rounded-[39px] bg-canvas px-4 pt-9 pb-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-xs text-slate-500">Bonjour Aïcha</p>
              <p className="mt-0.5 font-display text-xl font-bold tracking-tight text-ink">Suivi de Malik</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-100 text-13px font-semibold text-accent-700">AK</span>
          </div>
          <div className="rounded-[22px] bg-white p-4 shadow-[0_0_0_1px_rgb(15_23_42/0.06)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Mardi · 17h-20h</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-11px font-semibold text-emerald-700">Confirmée</span>
            </div>
            <p className="mt-2.5 text-13px leading-normal text-slate-700">Équations du second degré : six exercices corrigés ensemble. Deux à rendre jeudi.</p>
            <div className="mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3">
              <span className="flex size-7.5 items-center justify-center rounded-full bg-brand-100 text-11px font-semibold text-brand-700">KD</span>
              <div>
                <p className="text-13px font-semibold text-ink">Koffi Dossou</p>
                <p className="text-11px text-slate-500">Mathématiques, PCT</p>
              </div>
            </div>
          </div>
          <div className="rounded-[22px] bg-brand-600 p-4 text-white">
            <p className="text-xs text-brand-200">Prochaine échéance</p>
            <p className="mt-1 font-display text-27px font-bold tracking-tight">24 000 FCFA</p>
            <div className="mt-3 flex gap-1.5">
              {[true, true, false, false].map((done, i) => (
                <span key={i} className={cx("h-1.5 flex-1 rounded-full", done ? "bg-accent-400" : "bg-white/20")} />
              ))}
            </div>
            <p className="mt-2 text-11px text-brand-200">Échéance 3 sur 4</p>
          </div>
          <div className="flex gap-2">
            {["Séances", "Payer"].map((t) => (
              <span key={t} className="flex-1 rounded-2xl bg-white py-2.5 text-center text-xs font-semibold text-ink shadow-[0_0_0_1px_rgb(15_23_42/0.06)]">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <FloatingChip icon={ShieldCheck} iconClass="bg-brand-50 text-brand-600" title="Dossier vérifié" text="Identité, casier, diplômes" className="top-16 left-0" />
      <FloatingChip icon={Wallet} iconClass="bg-emerald-50 text-emerald-600" title="Payé par MTN MoMo" text="Reçu envoyé à l'instant" className="-right-2 bottom-20" />
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <div className="overflow-hidden text-ink">
      {/* Haut de page */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2.5 rounded-full bg-brand-50 py-1.5 pr-3.5 pl-1.5 text-sm font-medium text-brand-700">
            <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">Tutorat à domicile</span>
            Cotonou et Abomey-Calavi
          </p>
          <h1 className="mt-7 font-display text-[clamp(2.875rem,6.2vw,5.375rem)] leading-[0.98] font-bold tracking-[-0.035em]">
            Le bon répétiteur,
            <br />
            <span className="relative inline-block text-accent-500">
              chez vous
              <svg viewBox="0 0 300 18" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-2.5 h-3.5 w-full" aria-hidden>
                <path d="M3 13C70 4 180 2 297 9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
            , en confiance.
          </h1>
          <p className="mt-8 max-w-[520px] text-lg leading-relaxed text-slate-600 sm:text-[19px]">
            Access met en relation les familles et des éducateurs vérifiés, du collège à la terminale. Vous suivez chaque séance et payez en Mobile Money.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/inscription?role=PARENT" className={pillDark}>
              Trouver un éducateur
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/inscription?role=EDUCATOR" className={pillLight}>
              Devenir éducateur
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-15px text-slate-600">
            {["Éducateurs vérifiés", "Compte rendu de chaque séance", "MTN et Moov Money"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-5 text-emerald-600" strokeWidth={2} aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <PhonePreview />
      </section>

      {/* Bandeau de confiance */}
      <section aria-label="Moyens de paiement"className="border-y border-slate-100 bg-[#fbfcfe]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-5 px-4 py-7 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <p className="text-sm text-slate-500">Paiement en ligne sécurisé par FedaPay</p>
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6" aria-label="Moyens de paiement acceptés">
              {PAYMENT_LOGOS.map((l) => (
                <li key={l.src}>
                  <Image src={l.src} alt={l.alt} width={l.width} height={l.height} className="h-8 w-auto rounded-md sm:h-10" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section id="fonctionnement" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-30">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className={eyebrow}>Fonctionnement</p>
            <h2 className={cx("mt-3.5", sectionTitle)}>Quatre étapes, tout depuis votre téléphone.</h2>
          </div>
          <div className="max-w-sm">
            <p className="text-[17px] leading-relaxed text-slate-600">De l&apos;inscription au paiement, Access vous accompagne sans paperasse ni déplacement.</p>
            <MoreLink href="/fonctionnement">Le fonctionnement en détail</MoreLink>
          </div>
        </div>
        <ol className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-[28px] bg-canvas p-7">
              <span className="block font-display text-6xl leading-none font-extrabold text-brand-100" aria-hidden>
                0{i + 1}
              </span>
              <h3 className="mt-7 font-display text-[22px] font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2.5 text-15px leading-relaxed text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Familles : grille de cartes */}
      <section id="familles" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-30">
        <div className="max-w-3xl">
          <p className={eyebrow}>Pour les familles</p>
          <h2 className={cx("mt-3.5", sectionTitle)}>Vous savez qui vient chez vous, et ce qui est fait.</h2>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <article className="flex flex-col gap-8 rounded-[28px] bg-brand-600 p-8 text-white sm:p-9 lg:col-span-2 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <IconBox icon={ShieldCheck} className="bg-white/10 text-accent-400" />
              <h3 className="mt-6 font-display text-[30px] leading-[1.1] font-bold tracking-[-0.025em]">Chaque éducateur est contrôlé avant d&apos;être proposé.</h3>
              <p className="mt-3.5 leading-relaxed text-brand-200">L&apos;équipe Access examine le dossier complet, puis attribue une note et un niveau visibles sur le profil.</p>
              <MoreLink href="/confiance" tone="light">
                Notre démarche de confiance
              </MoreLink>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] px-4 py-3.5">
                  <span className="text-15px">{c.label}</span>
                  <span className="text-13px font-semibold text-emerald-300">{c.status}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[28px] bg-accent-50 p-8">
            <IconBox icon={ClipboardCheck} className="bg-white text-accent-600" />
            <h3 className="mt-6 font-display text-2xl leading-tight font-bold tracking-tight">Un compte rendu après chaque séance</h3>
            <p className="mt-2.5 text-15px leading-relaxed text-accent-900">L&apos;éducateur décrit le travail fait. Vous confirmez, ou vous contestez en un geste.</p>
            <div className="mt-6 flex gap-2" aria-hidden>
              <span className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Confirmer</span>
              <span className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink">Contester</span>
            </div>
          </article>

          <article className="rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <IconBox icon={Wallet} className="bg-brand-50 text-brand-600" />
            <h3 className="mt-6 font-display text-2xl leading-tight font-bold tracking-tight">Un prix clair, connu d&apos;avance</h3>
            <p className="mt-2.5 text-15px leading-relaxed text-slate-600">Le tarif dépend de la classe. Vous payez par échéances de quatre semaines, en Mobile Money.</p>
            <MoreLink href="/tarifs">Voir les tarifs</MoreLink>
          </article>

          <article className="rounded-[28px] bg-white p-8 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
            <IconBox icon={BellRing} className="bg-brand-50 text-brand-600" />
            <h3 className="mt-6 font-display text-2xl leading-tight font-bold tracking-tight">Des rappels au bon moment</h3>
            <p className="mt-2.5 text-15px leading-relaxed text-slate-600">Notifications avant chaque échéance et à chaque nouveau compte rendu.</p>
          </article>

          <article className="rounded-[28px] bg-brand-600 p-8 text-white">
            <IconBox icon={Smartphone} className="bg-white/15 text-white" />
            <h3 className="mt-6 font-display text-2xl leading-tight font-bold tracking-tight">Une app, sans passer par un store</h3>
            <p className="mt-2.5 text-15px leading-relaxed text-brand-100">Installez Access sur l&apos;écran d&apos;accueil de votre téléphone en un geste.</p>
          </article>
        </div>
      </section>

      {/* Éducateurs */}
      <section id="educateurs" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6 sm:pb-30">
        <div className="relative flex flex-col gap-12 overflow-hidden rounded-[40px] bg-brand-950 p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:p-18">
          <div className={cx("absolute inset-0 opacity-50", dots)} aria-hidden />
          <div className="relative min-w-0 flex-[1.2]">
            <p className="text-sm font-semibold tracking-[0.08em] text-accent-300 uppercase">Pour les éducateurs</p>
            <h2 className={cx("mt-3.5", sectionTitle)}>Des élèves près de chez vous. Des paiements garantis.</h2>
            <ul className="mt-9 space-y-4">
              {educatorPoints.map((p) => (
                <li key={p} className="flex items-center gap-3.5 text-[17px] text-brand-100">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                    <Check className="size-4" strokeWidth={2.6} aria-hidden />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/inscription?role=EDUCATOR" className={cx(pill, "bg-accent-500 text-white hover:bg-accent-600")}>
                Proposer mes services
              </Link>
              <Link href="/devenir-educateur" className="font-semibold text-white underline-offset-4 hover:underline">
                Comment ça marche pour les éducateurs
              </Link>
            </div>
          </div>
          <div className="relative flex min-w-0 flex-1 flex-col gap-3.5" aria-hidden>
            <div className="rounded-3xl bg-white p-6 text-ink">
              <p className="text-13px text-slate-500">Versement reçu sur Mobile Money</p>
              <p className="mt-1.5 font-display text-[40px] font-extrabold tracking-tight">20 400 FCFA</p>
              <p className="mt-1.5 text-13px font-semibold text-emerald-700">Échéance de Malik · payée par la famille</p>
            </div>
            <div className="rounded-3xl bg-white/[0.08] px-6 py-5">
              <p className="mb-3 text-13px text-brand-200">Mes disponibilités</p>
              <div className="grid grid-cols-5 gap-1.5">
                {slots.map((open, i) => (
                  <span key={i} className={cx("h-7.5 rounded-lg", open ? "bg-accent-400" : "bg-white/[0.12]")} />
                ))}
              </div>
              <p className="mt-3 text-xs text-brand-200">Créneaux protégés contre les doubles réservations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Questions fréquentes */}
      <section id="questions" className="mx-auto flex max-w-6xl scroll-mt-24 flex-col gap-12 px-4 pb-24 sm:px-6 sm:pb-30 lg:flex-row">
        <div className="min-w-0 lg:flex-1">
          <p className={eyebrow}>Questions</p>
          <h2 className={cx("mt-3.5", sectionTitle)}>Les réponses avant de vous lancer.</h2>
          <MoreLink href="/aide">Toutes les questions</MoreLink>
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:flex-[2]">
          {faq.map((f) => (
            <details key={f.q} className="group rounded-[22px] bg-canvas px-6">
              <summary className="flex min-h-18 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white transition group-open:rotate-45" aria-hidden>
                  <Plus className="size-[18px]" strokeWidth={1.8} />
                </span>
              </summary>
              <p className="pb-6 leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand title="Le prochain bulletin commence ici." />
    </div>
  );
}
