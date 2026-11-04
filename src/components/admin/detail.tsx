// Briques communes aux fiches détaillées de l'espace admin (éducateur, parent, élève).
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Mail, Phone, type LucideIcon } from "lucide-react";
import { TUTORING_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { buttonClass, cx } from "@/components/ui";
import { TutoringBadge } from "@/components/status";
import { Avatar } from "@/components/avatar";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-700">
      <ChevronLeft className="size-4" aria-hidden />
      {children}
    </Link>
  );
}

// Carte d'en-tête : identité à gauche, actions à droite, puis une rangée d'indicateurs.
export function DetailHeader({ avatar, title, badges, meta, actions, metrics }: { avatar: ReactNode; title: string; badges?: ReactNode; meta: ReactNode; actions?: ReactNode; metrics: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-soft">
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {avatar}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-22px font-semibold tracking-tight text-ink">{title}</h1>
              {badges}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-13px text-slate-500 [&_svg]:size-3.5">{meta}</div>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <dl className="grid grid-cols-2 border-t border-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-slate-100">{metrics}</dl>
    </section>
  );
}

export function ContactActions({ phone, email }: { phone: string; email: string }) {
  return (
    <>
      <a href={`tel:${phone}`} className={buttonClass("secondary", undefined, "sm")}>
        <Phone aria-hidden /> {phone}
      </a>
      <a href={`mailto:${email}`} className={buttonClass("secondary", undefined, "sm")}>
        <Mail aria-hidden /> Écrire
      </a>
    </>
  );
}

export function MetaItem({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden /> {children}
    </span>
  );
}

export function Metric({ label, children, tone }: { label: string; children: ReactNode; tone?: "red" | "amber" | "green" }) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={cx("mt-1 text-lg font-semibold tabular-nums", tone === "red" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : tone === "green" ? "text-emerald-700" : "text-ink")}>
        {children}
      </dd>
    </div>
  );
}

// Ligne « icône · libellé · valeur » des cartes de coordonnées.
export function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400" aria-hidden>
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 text-13px text-slate-500">{children}</p>}
    </div>
  );
}

// Lien vers une autre fiche (parent, enfant), présenté comme une petite carte.
export function PersonLink({ href, name, label, meta, trailing }: { href: string; name: string; label?: string; meta?: ReactNode; trailing?: ReactNode }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition hover:border-brand-200 hover:bg-slate-50">
      <Avatar name={name} size={label ? 36 : 44} />
      <div className="min-w-0 flex-1">
        {label && <p className="text-xs text-slate-500">{label}</p>}
        <p className={cx("truncate font-medium text-ink", label ? "text-sm" : "text-15px")}>{name}</p>
        {meta && <p className="truncate text-13px text-slate-500">{meta}</p>}
      </div>
      {trailing}
      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
    </Link>
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type TutoringSummary = { id: string; status: keyof typeof TUTORING_STATUS; startDate: Date; endDate: Date; durationWeeks: number };

// Avancement d'un tutorat : semaine en cours pour un tutorat actif, période sinon.
function Progress({ t, now }: { t: TutoringSummary; now: Date }) {
  if (t.status !== "ACTIVE") {
    return (
      <p className="text-xs text-slate-500">
        Du {formatDate(t.startDate)} au {formatDate(t.endDate)}
      </p>
    );
  }
  if (now < t.startDate) return <p className="text-xs text-slate-500">Commence le {formatDate(t.startDate)}</p>;
  const week = Math.min(t.durationWeeks, Math.floor((now.getTime() - t.startDate.getTime()) / WEEK_MS) + 1);
  const percent = Math.round((week / t.durationWeeks) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>
          Semaine {week} / {t.durationWeeks}
        </span>
        <span className="tabular-nums">{percent} %</span>
      </div>
      <progress
        value={week}
        max={t.durationWeeks}
        aria-label={`Semaine ${week} sur ${t.durationWeeks}`}
        className="mt-1 block h-1.5 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-brand-500 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-brand-500"
      />
    </div>
  );
}

// `now` vient de la page : l'heure de la requête, identique pour toutes les lignes.
export function TutoringRow({ tutoring, person, title, meta, now }: { tutoring: TutoringSummary; person: string; title: ReactNode; meta: ReactNode; now: Date }) {
  return (
    <li>
      <Link href={`/admin/tutorats/${tutoring.id}`} className="group -mx-2 flex flex-col gap-3 rounded-xl px-2 py-3.5 transition hover:bg-slate-50 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={person} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{title}</p>
            <p className="truncate text-13px text-slate-500">{meta}</p>
          </div>
        </div>
        <div className="w-full sm:w-44">
          <Progress t={tutoring} now={now} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TutoringBadge status={tutoring.status} />
          <ChevronRight className="hidden size-4 text-slate-300 transition group-hover:text-brand-500 sm:block" aria-hidden />
        </div>
      </Link>
    </li>
  );
}
