import { requireRole } from "@/lib/auth/dal";
import { Card, PageHeader } from "@/components/ui";
import { ChildForm } from "@/components/parent/child-form";
import { getCurriculum } from "@/server/queries/curriculum";

export const metadata = { title: "Inscrire un enfant" };

export default async function NewChildPage() {
  await requireRole("PARENT");
  const curriculum = await getCurriculum();
  return (
    <>
      <PageHeader title="Inscrire un enfant" subtitle="Ces informations restent privées : seul l'éducateur choisi y a accès." back="/parent/enfants" />
      <Card>
        <ChildForm curriculum={curriculum} />
      </Card>
    </>
  );
}
