import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { Card, PageHeader, Tabs } from "@/components/ui";
import { type AdminClass, type AdminSubject, ClassList, NewClassForm, NewSubjectForm, SubjectList } from "@/components/admin/curriculum-forms";

export const metadata = { title: "Classes et matières" };

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  await requireRole("ADMIN");
  const tab = (await searchParams).onglet === "matieres" ? "matieres" : "classes";
  const [classLevels, subjectRows, childCounts, levelCounts, educators, tariffs] = await Promise.all([
    db.classLevel.findMany({ orderBy: { position: "asc" }, include: { subjects: { include: { subject: { select: { key: true } } } } } }),
    db.subject.findMany({ orderBy: { position: "asc" } }),
    db.child.groupBy({ by: ["currentClass"], _count: true }),
    db.subjectLevel.groupBy({ by: ["subject"], _count: true }),
    db.educatorProfile.findMany({ select: { classLevels: true, subjects: true } }),
    db.tariff.findMany({ select: { classLevel: true } }),
  ]);

  const subjects: AdminSubject[] = subjectRows.map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    active: s.active,
    usage: (levelCounts.find((l) => l.subject === s.key)?._count ?? 0) + educators.filter((e) => e.subjects.includes(s.key)).length,
  }));
  const classes: AdminClass[] = classLevels.map((c) => ({
    id: c.id,
    name: c.name,
    cycle: c.cycle,
    active: c.active,
    subjects: c.subjects.map((l) => l.subject.key),
    children: childCounts.find((x) => x.currentClass === c.name)?._count ?? 0,
    educators: educators.filter((e) => e.classLevels.includes(c.name)).length,
    hasTariff: tariffs.some((t) => t.classLevel === c.name),
  }));

  return (
    <>
      <PageHeader
        title="Classes et matières"
        subtitle="Une classe ou une matière désactivée n'est plus proposée aux familles ni aux éducateurs ; les fiches existantes restent intactes."
      />
      <Tabs
        label="Référentiel"
        current={tab}
        items={[
          { key: "classes", href: "/admin/referentiel", label: "Classes", count: classes.length },
          { key: "matieres", href: "/admin/referentiel?onglet=matieres", label: "Matières", count: subjects.length },
        ]}
      />
      {tab === "classes" ? (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_400px]">
          <Card
            title="Classes"
            description="Dans l'ordre où elles sont proposées : glissez la poignée ⋮⋮ (appui long sur mobile) pour les réordonner. Ouvrez une classe pour la modifier."
          >
            <ClassList classes={classes} subjects={subjects} />
          </Card>
          <Card title="Ajouter une classe" description="Fixez ensuite son tarif dans « Tarifs et paramètres » : sans tarif, aucun tutorat ne peut être créé." className="xl:sticky xl:top-24">
            <NewClassForm subjects={subjects} />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_400px]">
          <Card
            title="Matières"
            description="Glissez la poignée ⋮⋮ (appui long sur mobile) pour les réordonner. Le nom peut être corrigé à tout moment ; la clé, enregistrée dans les fiches, ne change pas."
          >
            <SubjectList subjects={subjects} />
          </Card>
          <Card title="Ajouter une matière" description="Cochez-la ensuite dans les classes concernées, depuis l'onglet Classes." className="order-first xl:sticky xl:top-24 xl:order-last">
            <NewSubjectForm />
          </Card>
        </div>
      )}
    </>
  );
}
