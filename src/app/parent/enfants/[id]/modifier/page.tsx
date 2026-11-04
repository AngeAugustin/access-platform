import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { Card, PageHeader } from "@/components/ui";
import { ChildForm } from "@/components/parent/child-form";
import { getCurriculum } from "@/server/queries/curriculum";

export const metadata = { title: "Modifier l'enfant" };

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("PARENT");
  const { id } = await params;
  const [child, curriculum] = await Promise.all([
    db.child.findFirst({ where: { id, parentId: user.id }, include: { subjectLevels: true } }),
    getCurriculum(),
  ]);
  if (!child) notFound();
  return (
    <>
      <PageHeader title="Modifier la fiche" back={`/parent/enfants/${id}`} />
      <Card>
        <ChildForm
          curriculum={curriculum}
          defaults={{
            id: child.id,
            npi: child.npi ?? undefined,
            firstName: child.firstName,
            lastName: child.lastName,
            sex: child.sex,
            birthDate: child.birthDate.toISOString().slice(0, 10),
            previousClass: child.previousClass ?? undefined,
            previousSchool: child.previousSchool ?? undefined,
            currentClass: child.currentClass,
            currentSchool: child.currentSchool ?? undefined,
            favoriteSubjects: child.favoriteSubjects ?? undefined,
            interests: child.interests ?? undefined,
            levels: Object.fromEntries(child.subjectLevels.map((l) => [l.subject, l.level])),
          }}
        />
      </Card>
    </>
  );
}
