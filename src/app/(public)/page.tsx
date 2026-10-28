import { redirect } from "next/navigation";
import {
  BadgeCheck,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  HandCoins,
  LineChart,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  UserRoundSearch,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/constants";
import { IconTile, LinkButton } from "@/components/ui";

const steps = [
  { icon: UserRoundSearch, title: "Inscrivez votre enfant", text: "Sa classe, son école et son niveau dans chaque matière, en deux minutes." },
  { icon: BadgeCheck, title: "Choisissez un éducateur vérifié", text: "Identité, casier judiciaire et diplômes contrôlés par l'équipe Access." },
  { icon: NotebookPen, title: "Suivez chaque séance", text: "L'éducateur décrit le travail fait, vous confirmez depuis votre téléphone." },
  { icon: Wallet, title: "Payez en Mobile Money", text: "Une échéance toutes les quatre semaines, réglée en ligne en quelques secondes." },
];

const parentPoints = [
  { icon: ShieldCheck, text: "Des éducateurs dont le dossier a été vérifié et noté" },
  { icon: ClipboardCheck, text: "Un compte rendu après chaque séance" },
  { icon: HandCoins, text: "Un prix clair, connu avant de vous engager" },
  { icon: BellRing, text: "Des rappels avant chaque échéance" },
];

const educatorPoints = [
  { icon: FileSearch, text: "Des familles qui vous trouvent par matière et par quartier" },
  { icon: CalendarClock, text: "Vos disponibilités protégées contre les doubles réservations" },
  { icon: Wallet, text: "Vos revenus versés sur votre Mobile Money" },
  { icon: LineChart, text: "Un suivi de vos élèves et de vos séances" },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto mb-16 w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-brand-200/50 via-white to-amber-100/60 blur-2xl" />
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Séance du mardi · 17h-20h</p>
            <p className="mt-0.5 font-semibold text-ink">Malik · 2nde CD</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/70">
            <CheckCircle2 className="size-3.5" /> Confirmée
          </span>
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
          Équations du second degré : cours repris, six exercices corrigés ensemble. Deux exercices à rendre jeudi.
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">KD</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Koffi Dossou</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Star className="size-3 fill-amber-400 text-amber-400" /> 4,8 · Mathématiques, PCT
            </p>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-16 -left-2 w-56 rounded-2xl sm:-left-10 border border-slate-200/80 bg-white p-4 shadow-lift">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="text-xs text-slate-500">Échéance 2 payée</p>
            <p className="font-semibold text-ink">24 000 FCFA</p>
          </div>
        </div>
      </div>
      <div className="absolute -top-6 -right-3 hidden rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-lift sm:block">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <BadgeCheck className="size-4 text-brand-600" /> Dossier vérifié
        </p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect(ROLE_HOME[user.role]);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_70%_10%,var(--color-brand-100),transparent_70%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(15_23_42/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-16 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-24 lg:pb-32">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/70 px-3 py-1 text-[13px] font-medium text-brand-700">
              <Sparkles className="size-3.5" /> Tutorat à domicile · Cotonou et Abomey-Calavi
            </p>
            <h1 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl lg:text-[56px]">
              Le bon répétiteur pour votre enfant, <span className="text-brand-600">en toute confiance.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Access met en relation les familles et des éducateurs vérifiés, du collège à la terminale. Vous suivez chaque séance et payez en Mobile Money.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/inscription?role=PARENT" size="lg">
                Trouver un éducateur
              </LinkButton>
              <LinkButton href="/inscription?role=EDUCATOR" variant="secondary" size="lg">
                Devenir éducateur
              </LinkButton>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {["Éducateurs vérifiés", "Suivi de chaque séance", "Paiement MTN et Moov"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="fonctionnement" className="border-t border-slate-100 bg-canvas py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold text-brand-600">Fonctionnement</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Quatre étapes, tout depuis votre téléphone.</h2>
          <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <IconTile icon={s.icon} />
                  <span className="text-sm font-semibold text-slate-300 tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid grid-cols-1 max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div id="familles" className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-soft sm:p-10">
            <p className="text-sm font-semibold text-brand-600">Pour les familles</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Vous savez qui vient chez vous, et ce qui est fait.</h2>
            <ul className="mt-8 space-y-4">
              {parentPoints.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-[15px] text-slate-700">
                  <IconTile icon={p.icon} size="sm" />
                  <span className="pt-1">{p.text}</span>
                </li>
              ))}
            </ul>
            <LinkButton href="/inscription?role=PARENT" className="mt-8">
              Inscrire mon enfant
            </LinkButton>
          </div>
          <div id="educateurs" className="relative overflow-hidden rounded-3xl bg-brand-950 p-8 text-white sm:p-10">
            <div className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
            <p className="relative text-sm font-semibold text-brand-300">Pour les éducateurs</p>
            <h2 className="relative mt-2 text-2xl font-semibold tracking-tight">Des élèves près de chez vous, des paiements garantis.</h2>
            <ul className="relative mt-8 space-y-4">
              {educatorPoints.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-[15px] text-brand-100">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                    <p.icon className="size-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="pt-1">{p.text}</span>
                </li>
              ))}
            </ul>
            <LinkButton href="/inscription?role=EDUCATOR" variant="secondary" className="relative mt-8 border-transparent">
              Proposer mes services
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200/80 bg-canvas p-8 sm:flex-row sm:items-center sm:p-10">
            <div className="flex items-center gap-4">
              <IconTile icon={Smartphone} size="lg" />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">Une application, sans passer par un store</h2>
                <p className="mt-1 text-sm text-slate-500">Installez Access sur l&apos;écran d&apos;accueil de votre téléphone et recevez les notifications.</p>
              </div>
            </div>
            <LinkButton href="/inscription" size="lg">
              Commencer
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
