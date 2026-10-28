import { notFound } from "next/navigation";
import { GraduationCap, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECTS, SUBJECT_LEVELS, type SubjectKey } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Card, DefinitionList, LinkButton, List, ListRow, PageHeader, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TutoringBadge } from "@/components/status";

export const metadata = { title: "Fiche enfant" };

const levelStyle = {
  WEAK: { width: "w-1/4", bar: "bg-rose-400" },
  AVERAGE: { width: "w-2/4", bar: "bg-amber-400" },
  GOOD: { width: "w-3/4", bar: "bg-brand-500" },
  VERY_GOOD: { width: "w-full", bar: "bg-emerald-500" },
} as const;

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
        back="/parent/enfants"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={fullName(child)} size={44} />
            {fullName(child)}
          </span>
        }
        subtitle={`${child.currentClass}${child.currentSchool ? ` · ${child.currentSchool}` : ""}`}
        action={
          <>
            <LinkButton href={`/parent/enfants/${child.id}/modifier`} variant="secondary">
              <Pencil aria-hidden /> Modifier
            </LinkButton>
            <LinkButton href={`/parent/educateurs?classe=${encodeURIComponent(child.currentClass)}&enfant=${child.id}`}>
              <GraduationCap aria-hidden /> Trouver un éducateur
            </LinkButton>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Niveau par matière" description="Renseigné par vous, partagé avec l'éducateur.">
          <ul className="space-y-3.5">
            {child.subjectLevels.map((l) => (
              <li key={l.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-700">{SUBJECTS[l.subject as SubjectKey] ?? l.subject}</span>
                  <span className="font-medium text-ink">{SUBJECT_LEVELS[l.level]}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cx("h-full rounded-full", levelStyle[l.level].width, levelStyle[l.level].bar)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
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
        <Card title="Tutorats" className="lg:col-span-2">
          {child.tutorings.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun tutorat pour l&apos;instant.</p>
          ) : (
            <List>
              {child.tutorings.map((t) => (
                <ListRow
                  key={t.id}
                  href={`/parent/tutorats/${t.id}`}
                  leading={<Avatar name={fullName(t.educator.user)} size={36} />}
                  title={fullName(t.educator.user)}
                  meta={`${formatDate(t.startDate)} → ${formatDate(t.endDate)}`}
                  trailing={<TutoringBadge status={t.status} />}
                />
              ))}
            </List>
          )}
        </Card>
      </div>
    </>
  );
}
