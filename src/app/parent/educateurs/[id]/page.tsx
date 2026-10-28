import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, TIME_SLOTS, WEEKDAYS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { getSettings } from "@/server/services/settings";
import { Badge, Card, PageHeader, Stars, cx } from "@/components/ui";
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
      <PageHeader title={fullName(educator.user)} back="/parent/educateurs" />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar documentId={educator.documents[0]?.id} name={fullName(educator.user)} size={72} />
              <div>
                <p className="text-sm text-slate-600">
                  {educator.zone} · {educator.experienceYears ?? 0} an(s) d&apos;expérience · {educator.level}
                </p>
                <p className="mt-1">
                  <Stars value={avg ?? educator.stars} />{" "}
                  <span className="text-xs text-slate-500">{educator.reviews.length ? `${avg!.toFixed(1)}/5 sur ${educator.reviews.length} avis` : "Note attribuée par Access"}</span>
                </p>
              </div>
            </div>
            {educator.bio && <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{educator.bio}</p>}
            <h3 className="mt-4 text-sm font-semibold">Parcours</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{educator.background}</p>
            <h3 className="mt-4 text-sm font-semibold">Matières</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {educator.subjects.map((s) => (
                <Badge key={s} tone="blue">
                  {SUBJECTS[s as SubjectKey] ?? s}
                </Badge>
              ))}
            </div>
            <h3 className="mt-4 text-sm font-semibold">Classes</h3>
            <p className="mt-1 text-sm text-slate-700">{educator.classLevels.join(", ")}</p>
          </Card>
          <Card title="Disponibilités">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="p-1" />
                    {days.map((d) => (
                      <th key={d} className="p-1 font-medium text-slate-600">
                        {WEEKDAYS[d].slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((s) => (
                    <tr key={s}>
                      <th className="whitespace-nowrap p-1 text-left font-medium text-slate-600">{TIME_SLOTS[s]}</th>
                      {days.map((d) => {
                        const available = educator.availabilities.some((a) => a.day === d && a.slot === s);
                        const booked = educator.bookedSlots.some((b) => b.day === d && b.slot === s);
                        return (
                          <td key={d} className="p-1">
                            <span
                              className={cx(
                                "block rounded py-1.5",
                                booked ? "bg-slate-200 text-slate-500" : available ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-300",
                              )}
                            >
                              {booked ? "Pris" : available ? "Libre" : "—"}
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
              <p className="text-sm text-slate-600">Pas encore d&apos;avis.</p>
            ) : (
              <ul className="space-y-3">
                {educator.reviews.map((r) => (
                  <li key={r.id} className="text-sm">
                    <Stars value={r.rating} /> <span className="text-xs text-slate-500">{r.parent.firstName} · {formatDate(r.createdAt)}</span>
                    {r.comment && <p className="mt-1 text-slate-700">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Demander un tutorat" className="h-fit lg:sticky lg:top-20">
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
