import { requireRole } from "@/lib/auth/dal";
import { Card, PageHeader } from "@/components/ui";
import { ChildForm } from "@/components/parent/child-form";

export const metadata = { title: "Inscrire un enfant" };

export default async function NewChildPage() {
  await requireRole("PARENT");
  return (
    <>
      <PageHeader title="Inscrire un enfant" back="/parent/enfants" />
      <Card>
        <ChildForm />
      </Card>
    </>
  );
}
