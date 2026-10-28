import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, PageHeader, Stars } from "@/components/ui";
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

  return (
    <>
      <PageHeader title="Mon dossier" subtitle={<>Statut : <ProfileBadge status={profile.status} /></>} />
      {profile.status === "REJECTED" && (
        <p className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">Dossier rejeté : {profile.rejectionReason}. Corrigez-le puis transmettez-le à nouveau.</p>
      )}
      {validated && (
        <Card className="mb-5">
          <p className="text-sm">
            Dossier vérifié le {formatDate(profile.validatedAt)} · niveau <strong>{profile.level}</strong> · <Stars value={profile.stars} />
          </p>
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Informations">
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
        <div className="space-y-5">
          <Card title="Pièces justificatives">
            <p className="mb-3 text-xs text-slate-600">PDF, JPG ou PNG, 5 Mo maximum. Seule votre photo est visible des familles.</p>
            <div className="space-y-2">
              {docTypes.map(([type, label]) => {
                const doc = profile.documents.find((d) => d.type === type);
                const required = (REQUIRED_DOCUMENTS as readonly string[]).includes(type);
                return (
                  <DocumentUpload
                    key={type}
                    type={type}
                    label={`${label}${required ? " *" : " (facultatif)"}`}
                    accept={type === "PHOTO" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}
                    current={doc ? { id: doc.id, name: doc.originalName } : undefined}
                    locked={validated && type !== "PHOTO"}
                  />
                );
              })}
            </div>
          </Card>
          {(profile.status === "INCOMPLETE" || profile.status === "REJECTED") && (
            <Card title="Transmission">
              <p className="mb-3 text-sm text-slate-600">Une fois le dossier complet, transmettez-le : l&apos;équipe Access vérifie vos pièces et vous attribue un niveau.</p>
              <SubmitProfileButton />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
