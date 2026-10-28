import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, SUBJECTS, type SubjectKey } from "@/lib/constants";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { Badge, Card, DefinitionList, PageHeader, Stars } from "@/components/ui";
import { ProfileBadge, TutoringBadge } from "@/components/status";
import { EducatorDecisionForms, UserStatusForm } from "@/components/admin/forms";
import { Avatar } from "@/components/avatar";
import { slotLabel } from "@/server/services/tutoring";

export const metadata = { title: "Dossier éducateur" };

export default async function AdminEducatorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const e = await db.educatorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      documents: true,
      availabilities: true,
      validatedBy: { select: { firstName: true, lastName: true } },
      tutorings: { include: { child: true }, orderBy: { startDate: "desc" }, take: 20 },
      reviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!e) notFound();

  return (
    <>
      <PageHeader
        back="/admin/educateurs"
        eyebrow="Dossier éducateur"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={fullName(e.user)} documentId={e.documents.find((d) => d.type === "PHOTO")?.id} size={48} />
            {fullName(e.user)}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <ProfileBadge status={e.status} />
            {e.user.status === "SUSPENDED" && <Badge tone="red">Compte suspendu</Badge>}
          </span>
        }
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Identité et contact">
            <DefinitionList
              items={[
                ["NPI", e.user.npi],
                ["E-mail", e.user.email],
                ["Téléphone", e.user.phone],
                ["Adresse", [e.user.address, e.user.city].filter(Boolean).join(", ") || "—"],
                ["Date de naissance", formatDate(e.birthDate)],
                ["Situation matrimoniale", e.maritalStatus ?? "—"],
                ["Inscrit le", formatDate(e.user.createdAt)],
                ["Dernière connexion", formatDateTime(e.user.lastLoginAt)],
              ]}
            />
          </Card>
          <Card title="Profil pédagogique">
            <DefinitionList
              items={[
                ["Expérience", `${e.experienceYears ?? 0} an(s)`],
                ["Zone", e.zone ?? "—"],
                ["Matières", e.subjects.map((s) => SUBJECTS[s as SubjectKey] ?? s).join(", ") || "—"],
                ["Classes", e.classLevels.join(", ") || "—"],
                ["Disponibilités", e.availabilities.map((a) => slotLabel(a.day, a.slot)).join(", ") || "—"],
                ["Mobile Money", e.payoutPhone ?? "—"],
              ]}
            />
            <h3 className="mt-4 text-sm font-semibold">Parcours</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{e.background ?? "—"}</p>
          </Card>
          <Card title="Garants">
            <DefinitionList
              items={[
                ["Garant 1", `${e.guarantor1Name ?? "—"} · ${e.guarantor1Phone ?? ""}`],
                ["Adresse", e.guarantor1Address ?? "—"],
                ["Garant 2", `${e.guarantor2Name ?? "—"} · ${e.guarantor2Phone ?? ""}`],
                ["Adresse ", e.guarantor2Address ?? "—"],
              ]}
            />
          </Card>
          <Card title="Tutorats">
            {e.tutorings.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun tutorat.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {e.tutorings.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 py-2">
                    <Link href={`/admin/tutorats/${t.id}`} className="font-medium text-brand-700 hover:text-brand-800">
                      {fullName(t.child)} · {formatDate(t.startDate)}
                    </Link>
                    <TutoringBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Pièces justificatives">
            <ul className="divide-y divide-slate-100 text-sm">
              {(Object.keys(DOCUMENT_TYPES) as (keyof typeof DOCUMENT_TYPES)[]).map((type) => {
                const doc = e.documents.find((d) => d.type === type);
                return (
                  <li key={type} className="flex items-center justify-between gap-2 py-2.5">
                    <span>{DOCUMENT_TYPES[type]}</span>
                    {doc ? (
                      <a href={`/api/fichiers/${doc.id}`} target="_blank" rel="noopener" className="text-brand-700 underline">
                        Ouvrir ({Math.round(doc.size / 1024)} Ko)
                      </a>
                    ) : (
                      <Badge tone="red">Manquant</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Décision">
            {e.status === "VALIDATED" && (
              <p className="mb-3 text-sm">
                Validé le {formatDate(e.validatedAt)}
                {e.validatedBy ? ` par ${fullName(e.validatedBy)}` : ""} · {e.level} · <Stars value={e.stars} />
              </p>
            )}
            {e.status === "REJECTED" && <p className="mb-3 text-sm text-rose-700">Rejeté : {e.rejectionReason}</p>}
            {e.status === "INCOMPLETE" ? (
              <p className="text-sm text-slate-600">Dossier pas encore transmis par l&apos;éducateur.</p>
            ) : (
              <EducatorDecisionForms educatorId={e.id} defaults={{ stars: e.stars ?? undefined, level: e.level ?? undefined }} />
            )}
          </Card>
          <Card title="Compte">
            <UserStatusForm userId={e.userId} status={e.user.status} />
          </Card>
          <Card title="Avis des familles">
            {e.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun avis.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {e.reviews.map((r) => (
                  <li key={r.id}>
                    <Stars value={r.rating} /> {r.comment}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
