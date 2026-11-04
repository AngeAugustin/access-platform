import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, Check, ChevronLeft, MapPin, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { age, formatFcfa, fullName } from "@/lib/format";
import { getSettings } from "@/server/services/settings";
import { tutorReliability } from "@/server/queries/follow-ups";
import { cx } from "@/components/ui";
import { darkPanel, display, panel, roundIcon } from "@/components/parent/kit";
import { dots } from "@/components/marketing";
import { Avatar } from "@/components/avatar";
import { FollowUpRequestForm } from "@/components/parent/follow-up-request-form";

export const metadata = { title: "Profil tuteur" };

export default async function TutorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enfant?: string }> }) {
  const parent = await requireRole("PARENT");
  const { id } = await params;
  const { enfant } = await searchParams;
  const tutor = await db.tutorProfile.findFirst({
    where: { id, status: "VALIDATED", user: { status: "ACTIVE" } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      documents: { where: { type: "PHOTO" }, select: { id: true } },
      _count: { select: { followUps: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!tutor) notFound();

  const [children, busy, settings, reliability] = await Promise.all([
    db.child.findMany({ where: { parentId: parent.id }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, currentClass: true } }),
    db.followUpChild.findMany({ where: { child: { parentId: parent.id }, followUp: { status: { in: ["REQUESTED", "ACTIVE"] } } }, select: { childId: true } }),
    getSettings(),
    tutorReliability([tutor.id]).then((m) => m.get(tutor.id)),
  ]);
  const name = fullName(tutor.user);
  const busyIds = new Set(busy.map((b) => b.childId));

  return (
    <>
      <div className={cx(darkPanel, dots, "relative -mx-4 -mt-4 rounded-t-none px-4 pt-4 pb-16 sm:mx-0 sm:mt-0 sm:rounded-t-[28px] sm:px-6")}>
        <Link href={`/parent/tuteurs${enfant ? `?enfant=${enfant}` : ""}`} className={cx(roundIcon, "bg-white/10 hover:bg-white/20")} aria-label="Retour aux tuteurs">
          <ChevronLeft className="size-5" strokeWidth={1.9} aria-hidden />
        </Link>
      </div>
      <div className="relative -mt-12 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <section className={cx(panel, "p-5 shadow-[0_20px_40px_-24px_rgb(0_74_173/0.35)] sm:p-6")}>
            <div className="flex items-center gap-4">
              <Avatar documentId={tutor.documents[0]?.id} name={name} size={72} />
              <div className="min-w-0">
                <h1 className={cx(display, "text-[26px] leading-tight font-bold text-ink")}>{name}</h1>
                <p className="mt-0.5 text-sm text-slate-500">Tuteur Access{tutor.birthDate ? ` · ${age(tutor.birthDate)} ans` : ""}</p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-100 text-center">
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">faites à temps</dt>
                <dd className={cx(display, "text-xl font-bold text-ink")}>{reliability?.rate != null ? `${reliability.rate} %` : "-"}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">retours (30 j)</dt>
                <dd className={cx(display, "text-xl font-bold text-ink")}>{reliability?.reported ?? 0}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500">familles suivies</dt>
                <dd className={cx(display, "text-xl font-bold text-ink")}>{tutor._count.followUps}</dd>
              </div>
            </dl>
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              {tutor.zone && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden /> {tutor.zone}
                </li>
              )}
              {tutor.occupation && (
                <li className="flex items-start gap-2">
                  <Briefcase className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden /> {tutor.occupation}
                </li>
              )}
            </ul>
            {tutor.bio && <p className="mt-4 border-t border-slate-100 pt-4 text-15px leading-relaxed whitespace-pre-line text-slate-600">{tutor.bio}</p>}
          </section>

          <section className="rounded-[22px] bg-emerald-50 p-4">
            <p className="flex items-center gap-1.5 text-13px font-bold text-emerald-800">
              <BadgeCheck className="size-4" aria-hidden /> Dossier vérifié par Access
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-13px text-emerald-900">
              {["Identité", "Casier judiciaire", "Un garant"].map((c) => (
                <li key={c} className="flex items-center gap-1">
                  <Check className="size-3.5" strokeWidth={2.4} aria-hidden /> {c}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section id="demande" className="min-w-0 scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white shadow-soft">
          <header className="border-b border-slate-100 p-5 sm:px-6">
            <h2 className="text-15px font-semibold tracking-tight text-ink">Demander un suivi</h2>
            <p className="mt-2 text-sm text-slate-500">
              À partir de <span className="text-xl font-semibold tracking-tight text-ink tabular-nums">{formatFcfa(settings.followUpFirstChild)}</span> / mois
            </p>
          </header>
          <div className="p-5 sm:px-6">
            <FollowUpRequestForm
              tutorId={tutor.id}
              kids={children.map((c) => ({ ...c, busy: busyIds.has(c.id) }))}
              defaultChildId={enfant}
              grid={{ followUpFirstChild: settings.followUpFirstChild, followUpExtraChild: settings.followUpExtraChild }}
            />
          </div>
        </section>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="size-3.5" aria-hidden /> Tuteur vérifié par Access : identité, casier et garant.
      </p>
    </>
  );
}
