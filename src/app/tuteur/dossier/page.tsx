import { Check, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { requireTutorSpace } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, TUTOR_REQUIRED_DOCUMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Card, Notice, PageHeader } from "@/components/ui";
import { ProfileBadge } from "@/components/status";
import { DocumentUpload } from "@/components/educator/document-upload";
import { ActivateTutorButton, SubmitTutorDossierButton, TutorDossierForm } from "@/components/tutor/dossier-form";
import { uploadTutorDocumentAction } from "@/server/actions/tutor";

export const metadata = { title: "Mon dossier de tuteur" };

export default async function TutorDossierPage() {
  const user = await requireTutorSpace();
  let profile = await db.tutorProfile.findUnique({ where: { userId: user.id }, include: { documents: true } });
  if (!profile && user.role === "TUTOR") {
    await db.tutorProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    profile = await db.tutorProfile.findUniqueOrThrow({ where: { userId: user.id }, include: { documents: true } });
  }
  if (!profile) {
    return (
      <>
        <PageHeader title="Devenir tuteur" subtitle="Accompagnez des familles au quotidien, en plus de vos cours." />
        <Card>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            Le parent vous confie le suivi de ses enfants : vérifier les leçons du soir, les devoirs, passer à l&apos;école consulter les notes. Vous lui faites un retour après chaque
            action, depuis votre téléphone. Le forfait mensuel est fixé par Access.
          </p>
          <div className="mt-5">
            <ActivateTutorButton />
          </div>
        </Card>
      </>
    );
  }

  const locked = profile.status === "SUBMITTED" || profile.status === "VALIDATED";
  const profileDone = Boolean(profile.zone && profile.occupation && profile.birthDate && profile.guarantorName && profile.payoutPhone);
  const missingDocs = TUTOR_REQUIRED_DOCUMENTS.filter((t) => !profile.documents.some((d) => d.type === t));
  const checklist = [
    { label: "Profil, garant et Mobile Money", done: profileDone },
    ...TUTOR_REQUIRED_DOCUMENTS.map((t) => ({ label: DOCUMENT_TYPES[t], done: !missingDocs.includes(t) })),
  ];

  return (
    <>
      <PageHeader title="Mon dossier de tuteur" subtitle="Vérifié par Access avant que les familles puissent vous demander un suivi." action={<ProfileBadge status={profile.status} />} />
      <div className="mb-5 empty:hidden">
      {profile.status === "REJECTED" && profile.rejectionReason && (
        <Notice tone="red" title="Dossier à corriger">
          {profile.rejectionReason}
        </Notice>
      )}
      {profile.status === "SUBMITTED" && (
        <Notice tone="blue" title="Dossier en cours de vérification">
          Transmis le {formatDate(profile.submittedAt)}. Access vous prévient par e-mail dès qu&apos;il est vérifié.
        </Notice>
      )}
      {profile.status === "VALIDATED" && (
        <Notice tone="green" title="Dossier vérifié">
          Les familles vous trouvent dans le catalogue Access depuis le {formatDate(profile.validatedAt)}.
        </Notice>
      )}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <Card title="Profil">
            <TutorDossierForm
              locked={locked}
              defaults={{
                birthDate: profile.birthDate?.toISOString().slice(0, 10),
                zone: profile.zone ?? undefined,
                occupation: profile.occupation ?? undefined,
                bio: profile.bio ?? undefined,
                guarantorName: profile.guarantorName ?? undefined,
                guarantorPhone: profile.guarantorPhone ?? undefined,
                payoutPhone: profile.payoutPhone ?? undefined,
                payoutOperator: profile.payoutOperator ?? undefined,
              }}
            />
          </Card>
          <Card title="Pièces justificatives" description="PDF, JPG ou PNG, 5 Mo maximum. La photo s'affiche dans le catalogue.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TUTOR_REQUIRED_DOCUMENTS.map((t) => {
                const doc = profile.documents.find((d) => d.type === t);
                return (
                  <DocumentUpload
                    key={t}
                    type={t}
                    label={DOCUMENT_TYPES[t]}
                    required
                    accept={t === "PHOTO" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}
                    current={doc ? { id: doc.id, name: doc.originalName } : undefined}
                    locked={profile.status === "VALIDATED" && t !== "PHOTO"}
                    action={uploadTutorDocumentAction}
                  />
                );
              })}
            </div>
          </Card>
        </div>
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title="Avant de transmettre">
            <ul className="space-y-2.5 text-sm">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5">
                  {c.done ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Circle className="size-4 text-slate-300" aria-hidden />}
                  <span className={c.done ? "text-ink" : "text-slate-500"}>{c.label}</span>
                </li>
              ))}
            </ul>
            {!locked && (
              <div className="mt-5">
                <SubmitTutorDossierButton />
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
