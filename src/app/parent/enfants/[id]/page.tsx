import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, SUBJECT_LEVELS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Card, DefinitionList, LinkButton, PageHeader } from "@/components/ui";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Fiche enfant" };

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("PARENT");
  const { id } = await params;
  const child = await db.child.findFirst({
    where: { id, parentId: user.id },
    include: {
      subjectLevels: true,
      tutorings: { include: { educator: { include: { user: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!child) notFound();

  return (
    <>
      <PageHeader
        title={fullName(child)}
        subtitle={`${child.currentClass}${child.currentSchool ? ` · ${child.currentSchool}` : ""}`}
        back="/parent/enfants"
        action={
          <div className="flex gap-2">
            <LinkButton href={`/parent/enfants/${child.id}/modifier`} variant="secondary">
              Modifier
            </LinkButton>
            <LinkButton href={`/parent/educateurs?classe=${encodeURIComponent(child.currentClass)}&enfant=${child.id}`}>Trouver un éducateur</LinkButton>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Informations">
          <DefinitionList
            items={[
              ["Sexe", child.sex === "F" ? "Fille" : "Garçon"],
              ["Date de naissance", formatDate(child.birthDate)],
              ["NPI", child.npi ?? "—"],
              ["Classe précédente", child.previousClass ?? "—"],
              ["École précédente", child.previousSchool ?? "—"],
              ["Matières préférées", child.favoriteSubjects ?? "—"],
              ["Centres d'intérêt", child.interests ?? "—"],
            ]}
          />
        </Card>
        <Card title="Niveau par matière">
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {child.subjectLevels.map((l) => (
              <li key={l.id} className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                <span>{SUBJECTS[l.subject as SubjectKey] ?? l.subject}</span>
                <span className="font-medium">{SUBJECT_LEVELS[l.level]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Tutorats" className="lg:col-span-2">
          {child.tutorings.length === 0 ? (
            <p className="text-sm text-slate-600">Aucun tutorat pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {child.tutorings.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/parent/tutorats/${t.id}`} className="flex items-center justify-between gap-3 hover:text-brand-700">
                    <span className="text-sm">
                      <span className="font-medium">{fullName(t.educator.user)}</span> · {formatDate(t.startDate)} → {formatDate(t.endDate)}
                    </span>
                    <TutoringBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
