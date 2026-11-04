"use client";

import { createContext, use, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck, MapPin, NotebookPen, Quote, Search, ShieldCheck, Smartphone, Star, Wallet, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { cx } from "@/components/ui";
import type { FeaturedReview } from "@/server/queries/public";

type Role = "PARENT" | "EDUCATOR" | "TUTOR";
type Variant = "login" | Role;

// Rôle choisi dans l'assistant d'inscription : le panneau de marque suit le choix en direct.
const RoleContext = createContext<{ role: Role | null; setRole: (r: Role) => void }>({ role: null, setRole: () => {} });

export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  return <RoleContext value={{ role, setRole }}>{children}</RoleContext>;
}

export function useSyncAuthRole(role: Role) {
  const { setRole } = use(RoleContext);
  useEffect(() => setRole(role), [role, setRole]);
}

function useVariant(): Variant {
  const pathname = usePathname();
  const params = useSearchParams();
  const { role } = use(RoleContext);
  if (pathname !== "/inscription") return "login";
  const fromUrl = params.get("role");
  return role ?? (fromUrl === "EDUCATOR" || fromUrl === "TUTOR" ? fromUrl : "PARENT");
}

const headlines: Record<Variant, { title: string; highlight: string }> = {
  login: { title: "Le suivi scolaire de vos enfants,", highlight: "en toute confiance." },
  PARENT: { title: "Le bon éducateur,", highlight: "près de chez vous." },
  EDUCATOR: { title: "Des élèves près de chez vous.", highlight: "Des paiements garantis." },
  TUTOR: { title: "Accompagnez des familles", highlight: "au quotidien." },
};

// Étoile du logo, en contour.
function LogoStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <path
        d="M200 30 L245 150 L375 150 L270 228 L310 355 L200 278 L90 355 L130 228 L25 150 L155 150 Z"
        className="fill-none stroke-accent-400"
        strokeWidth={9}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Connexion : l'avis d'un parent, ou à défaut une accroche et les trois engagements.
function LoginContent({ review }: { review: FeaturedReview | null }) {
  if (!review) {
    return (
      <>
        <p className="font-display text-[40px] leading-[1.05] font-bold tracking-tight">Chaque séance compte.</p>
        <p className="mt-4 max-w-sm text-brand-100">L&apos;accompagnement scolaire à domicile, suivi de près, partout au Bénin.</p>
        <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-brand-100">
          {[
            { icon: ShieldCheck, text: "Éducateurs vérifiés" },
            { icon: NotebookPen, text: "Chaque séance tracée" },
            { icon: Smartphone, text: "Paiement Mobile Money" },
          ].map((p) => (
            <li key={p.text} className="flex items-center gap-2">
              <p.icon className="size-4 text-accent-300" aria-hidden />
              {p.text}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <figure>
      <Quote className="size-10 text-accent-400" aria-hidden />
      <blockquote className="mt-4 line-clamp-6 font-display text-[28px] leading-[1.2] font-bold xl:text-[30px]">« {review.comment} »</blockquote>
      <figcaption className="mt-7 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-400 font-bold text-brand-950" aria-hidden>
          {review.parent.firstName.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{review.parent.firstName}</span>
          <span className="block text-sm text-brand-100">Parent d&apos;un élève de {review.tutoring.classLevel}</span>
        </span>
        <span className="ml-auto flex shrink-0 gap-0.5" role="img" aria-label={`Note : ${review.rating} sur 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={cx("size-4", i <= review.rating ? "fill-accent-400 text-accent-400" : "text-white/30")} aria-hidden />
          ))}
        </span>
      </figcaption>
      <Link href="/avis" className="mt-9 flex items-center justify-end gap-1.5 border-t border-white/15 pt-6 text-sm font-semibold text-accent-300 hover:text-accent-200">
        Tous les avis des familles <ArrowRight className="size-4" aria-hidden />
      </Link>
    </figure>
  );
}

function ParentContent() {
  return (
    <ul className="mt-10 space-y-5">
      {[
        { icon: Search, title: "Choisissez parmi des profils vérifiés", text: "Identité, casier judiciaire et diplômes contrôlés." },
        { icon: CalendarCheck, title: "Validez chaque séance", text: "Un compte rendu à confirmer après chaque cours." },
        { icon: Wallet, title: "Payez par échéance", text: "MTN, Moov ou carte, toutes les 4 semaines." },
      ].map((p) => (
        <li key={p.title} className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <p.icon className="size-5 text-accent-300" strokeWidth={1.8} aria-hidden />
          </span>
          <span>
            <span className="block font-semibold">{p.title}</span>
            <span className="block text-sm text-brand-100">{p.text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function EducatorContent() {
  return (
    <div className="mt-10 rounded-3xl bg-white/10 p-6 ring-1 ring-white/15">
      <p className="text-sm font-semibold tracking-[0.08em] text-accent-300 uppercase">Après l&apos;inscription</p>
      <ol className="mt-4 space-y-3 text-15px">
        {["Déposez vos pièces (CNI, casier, diplômes)", "Entretien avec l'équipe Access", "Recevez vos premières demandes"].map((t, i) => (
          <li key={t} className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-bold">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Headline({ variant, className }: { variant: Variant; className?: string }) {
  const h = headlines[variant];
  return (
    <p className={cx("font-display leading-[1.05] font-bold tracking-tight", className)}>
      {h.title} <span className="block text-accent-300">{h.highlight}</span>
    </p>
  );
}

// Panneau de marque, à gauche sur grand écran.
export function AuthAside({ review }: { review: FeaturedReview | null }) {
  const variant = useVariant();
  return (
    <aside className="relative hidden w-[min(680px,50%)] shrink-0 flex-col overflow-hidden rounded-[22px] bg-brand-600 p-10 text-white lg:flex xl:p-12">
      <LogoStar className="pointer-events-none absolute -right-24 -bottom-28 size-[420px] opacity-25" />
      <Logo href="/" tone="light" className="relative self-start [&_img]:h-14" />
      {/* pt-10 : garde un écart avec le logo quand la fenêtre est peu haute. */}
      <div key={variant} className="relative mt-auto animate-fade-in pt-10">
        {variant === "login" ? (
          <LoginContent review={review} />
        ) : (
          <>
            <Headline variant={variant} className="text-[40px] xl:text-[44px]" />
            {variant === "PARENT" ? <ParentContent /> : <EducatorContent />}
          </>
        )}
      </div>
      <p className="relative mt-10 flex items-center gap-2 text-xs text-brand-200">
        <MapPin className="size-3.5" aria-hidden /> Partout au Bénin
      </p>
    </aside>
  );
}

// Bandeau de marque, en haut sur mobile.
export function AuthMobileHeader() {
  const variant = useVariant();
  return (
    <div className="relative overflow-hidden bg-brand-600 px-6 pt-[calc(1.75rem+env(safe-area-inset-top))] pb-14 text-white lg:hidden">
      <LogoStar className="pointer-events-none absolute -top-10 -right-16 size-56 opacity-25" />
      <div className="relative flex items-center justify-between">
        <Logo href="/" tone="light" className="[&_img]:h-11" />
        <Link href="/" className="flex size-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Retour au site">
          <X className="size-4" aria-hidden />
        </Link>
      </div>
      <Headline variant={variant} className="relative mt-7 max-w-sm text-[26px]" />
    </div>
  );
}

// Barre du haut de la colonne formulaire, sur grand écran.
export function AuthTopBar() {
  const pathname = usePathname();
  const link =
    pathname === "/inscription"
      ? { text: "Déjà inscrit ?", href: "/connexion", label: "Se connecter" }
      : pathname === "/connexion"
        ? { text: "Pas encore de compte ?", href: "/inscription", label: "Créer un compte" }
        : { text: "", href: "/connexion", label: "Retour à la connexion" };
  return (
    <div className="hidden items-center justify-between text-sm lg:flex">
      <Link href="/" className="flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Retour au site
      </Link>
      <p className="text-slate-500">
        {link.text}{" "}
        <Link href={link.href} className="font-semibold text-brand-600 hover:text-brand-700">
          {link.label}
        </Link>
      </p>
    </div>
  );
}
