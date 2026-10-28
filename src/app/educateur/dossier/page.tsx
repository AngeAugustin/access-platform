import { BadgeCheck, CircleCheck, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { widthClass } from "@/lib/ui-scale";
import { Card, Notice, PageHeader, Stars, cx } from "@/components/ui";
import { ProfileBadge } from "@/components/status";
import { EducatorProfileForm, SubmitProfileButton } from "@/components/educator/profile-form";
import { DocumentUpload } from "@/components/educator/document-upload";

export const metadata = { title: "Mon dossier" };

export default async function DossierPage() {
  const user = await requireRole("EDUCATOR");
  const profile = await db.educatorProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
    include: { documents: true, availabilities: true, bookedSlots: true },
  });
  const docTypes = Object.entries(DOCUMENT_TYPES) as [keyof typeof DOCUMENT_TYPES, string][];
  const validated = profile.status === "VALIDATED";
  const checklist = [
    { label: "Informations et garants", done: Boolean(profile.background && profile.birthDate && profile.guarantor1Name && profile.guarantor2Name && profile.payoutPhone) },
    { label: "Matières et classes", done: profile.subjects.length > 0 && profile.classLevels.length > 0 },
    { label: "Disponibilités", done: profile.availabilities.length > 0 },
    { label: "Pièces obligatoires", done: REQUIRED_DOCUMENTS.every((t) => profile.documents.some((d) => d.type === t)) },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader title="Mon dossier" subtitle={<span className="flex items-center gap-2">Statut <ProfileBadge status={profile.status} /></span>} />
      {profile.status === "REJECTED" && (
        <div className="mb-6">
          <Notice tone="red" title="Dossier à corriger">
            {profile.rejectionReason}. Corrigez-le puis transmettez-le à nouveau.
          </Notice>
        </div>
      )}
      {validated && (
        <div className="mb-6">
          <Notice tone="green" icon={BadgeCheck} title={`Dossier vérifié le ${formatDate(profile.validatedAt)}`}>
            <span className="flex flex-wrap items-center gap-2">
              Niveau {profile.level} · <Stars value={profile.stars} />
            </span>
          </Notice>
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Informations" description="Ce que les familles voient sur votre profil, et ce qu'Access vérifie.">
          <EducatorProfileForm
            defaults={{
              birthDate: profile.birthDate?.toISOString().slice(0, 10),
              maritalStatus: profile.maritalStatus ?? undefined,
              experienceYears: profile.experienceYears ?? undefined,
              background: profile.background ?? undefined,
              bio: profile.bio ?? undefined,
              zone: profile.zone ?? undefined,
              subjects: profile.subjects,
              classLevels: profile.classLevels,
              guarantor1Name: profile.guarantor1Name ?? undefined,
              guarantor1Address: profile.guarantor1Address ?? undefined,
              guarantor1Phone: profile.guarantor1Phone ?? undefined,
              guarantor2Name: profile.guarantor2Name ?? undefined,
              guarantor2Address: profile.guarantor2Address ?? undefined,
              guarantor2Phone: profile.guarantor2Phone ?? undefined,
              payoutPhone: profile.payoutPhone ?? undefined,
              availabilities: profile.availabilities.map((a) => `${a.day}|${a.slot}`),
              booked: profile.bookedSlots.map((b) => `${b.day}|${b.slot}`),
            }}
          />
        </Card>
        <div className="space-y-6 xl:sticky xl:top-24">
          {!validated && (
            <Card title="Avancement" description={`${doneCount} étape${doneCount > 1 ? "s" : ""} sur ${checklist.length}`}>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cx("h-full rounded-full bg-brand-500 transition-all", widthClass((doneCount / checklist.length) * 100))} />
              </div>
              <ul className="space-y-2.5">
                {checklist.map((c) => (
                  <li key={c.label} className={cx("flex items-center gap-2.5 text-sm", c.done ? "text-slate-700" : "text-slate-500")}>
                    {c.done ? <CircleCheck className="size-4 text-emerald-500" aria-hidden /> : <Circle className="size-4 text-slate-300" aria-hidden />}
                    {c.label}
                  </li>
                ))}
              </ul>
              {(profile.status === "INCOMPLETE" || profile.status === "REJECTED") && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <SubmitProfileButton />
                </div>
              )}
            </Card>
          )}
          <Card title="Pièces justificatives" description="PDF, JPG ou PNG, 5 Mo maximum. Seule votre photo est visible des familles.">
            <div className="space-y-3">
              {docTypes.map(([type, label]) => {
                const doc = profile.documents.find((d) => d.type === type);
                const required = (REQUIRED_DOCUMENTS as readonly string[]).includes(type);
                return (
                  <DocumentUpload
                    key={type}
                    type={type}
                    label={label}
                    required={required}
                    accept={type === "PHOTO" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}
                    current={doc ? { id: doc.id, name: doc.originalName } : undefined}
                    locked={validated && type !== "PHOTO"}
                  />
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
