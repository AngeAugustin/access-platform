import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, TIME_SLOTS, WEEKDAYS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { getSettings } from "@/server/services/settings";
import { BadgeCheck, Briefcase, MapPin } from "lucide-react";
import { Badge, Card, PageHeader, Stars, Tag, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TutoringRequestForm } from "@/components/parent/tutoring-form";

export const metadata = { title: "Profil éducateur" };

export default async function EducatorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enfant?: string }> }) {
  const parent = await requireRole("PARENT");
  const { id } = await params;
  const { enfant } = await searchParams;
  const educator = await db.educatorProfile.findFirst({
    where: { id, status: "VALIDATED", user: { status: "ACTIVE" } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      documents: { where: { type: "PHOTO" }, select: { id: true } },
      availabilities: true,
      bookedSlots: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 10, include: { parent: { select: { firstName: true } } } },
    },
  });
  if (!educator) notFound();

  const [children, tariffs, settings] = await Promise.all([
    db.child.findMany({ where: { parentId: parent.id }, orderBy: { firstName: "asc" } }),
    db.tariff.findMany(),
    getSettings(),
  ]);
  const avg = educator.reviews.length ? educator.reviews.reduce((s, r) => s + r.rating, 0) / educator.reviews.length : null;
  const freeSlots = educator.availabilities
    .filter((a) => !educator.bookedSlots.some((b) => b.day === a.day && b.slot === a.slot))
    .map((a) => ({ day: a.day, slot: a.slot }));
  const days = Object.keys(WEEKDAYS) as (keyof typeof WEEKDAYS)[];
  const slots = Object.keys(TIME_SLOTS) as (keyof typeof TIME_SLOTS)[];

  return (
    <>
      <PageHeader title="Profil de l'éducateur" back="/parent/educateurs" />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar documentId={educator.documents[0]?.id} name={fullName(educator.user)} size={84} />
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
                  {fullName(educator.user)}
                  <BadgeCheck className="size-5 text-brand-600" aria-label="Dossier vérifié" />
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Stars value={avg ?? educator.stars} />
                    <span className="ml-1">{educator.reviews.length ? `${avg!.toFixed(1)} · ${educator.reviews.length} avis` : "Note Access"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden /> {educator.zone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="size-3.5" aria-hidden /> {educator.experienceYears ?? 0} an(s) d&apos;expérience
                  </span>
                </div>
                {educator.level && (
                  <div className="mt-3">
                    <Badge tone="blue">Niveau {educator.level}</Badge>
                  </div>
                )}
              </div>
            </div>
            {educator.bio && <p className="mt-6 text-[15px] leading-relaxed whitespace-pre-line text-slate-600">{educator.bio}</p>}
            <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div>
                <h3 className="text-[13px] font-medium text-slate-500">Matières</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {educator.subjects.map((s) => (
                    <Tag key={s}>{SUBJECTS[s as SubjectKey] ?? s}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-slate-500">Classes</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {educator.classLevels.map((c) => (
                    <Tag key={c}>{c}</Tag>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="text-[13px] font-medium text-slate-500">Parcours</h3>
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{educator.background}</p>
            </div>
          </Card>
          <Card title="Disponibilités" description="Les créneaux libres peuvent être réservés tout de suite.">
            <div className="scroll-x -mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[460px] border-separate border-spacing-1 text-center text-xs">
                <thead>
                  <tr>
                    <th className="w-16" />
                    {days.map((d) => (
                      <th key={d} className="pb-1 font-medium text-slate-500">
                        {WEEKDAYS[d].slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s}>
                      <th className="pr-2 text-left font-medium whitespace-nowrap text-slate-500">{TIME_SLOTS[s]}</th>
                      {days.map((d) => {
                        const available = educator.availabilities.some((a) => a.day === d && a.slot === s);
                        const booked = educator.bookedSlots.some((b) => b.day === d && b.slot === s);
                        return (
                          <td key={d}>
                            <span
                              className={cx(
                                "block rounded-lg py-2 font-medium",
                                booked ? "bg-slate-100 text-slate-400 line-through" : available ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset" : "bg-slate-50/60 text-transparent",
                              )}
                            >
                              {booked ? "Pris" : available ? "Libre" : "·"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Avis des familles">
            {educator.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Pas encore d&apos;avis : la note affichée est celle attribuée par Access après vérification du dossier.</p>
            ) : (
              <ul className="space-y-5">
                {educator.reviews.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <Avatar name={r.parent.firstName} size={32} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{r.parent.firstName}</span>
                        <Stars value={r.rating} />
                        <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Demander un tutorat" description="Le tarif dépend de la classe de l'enfant." className="lg:sticky lg:top-24">
          <TutoringRequestForm
            educatorId={educator.id}
            educatorClasses={educator.classLevels}
            kids={children.map((c) => ({ id: c.id, name: fullName(c), classLevel: c.currentClass }))}
            defaultChildId={enfant}
            freeSlots={freeSlots}
            tariffs={tariffs.map((t) => ({ classLevel: t.classLevel, hourlyRate: t.hourlyRate, sessionsPerWeek: t.sessionsPerWeek, hoursPerSession: t.hoursPerSession }))}
            maxWeeks={settings.maxDurationWeeks}
            weeksPerInstallment={settings.weeksPerInstallment}
          />
        </Card>
      </div>
    </>
  );
}
