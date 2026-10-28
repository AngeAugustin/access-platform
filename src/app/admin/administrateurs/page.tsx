import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { CreateAdminForm, UserStatusForm } from "@/components/admin/forms";

export const metadata = { title: "Administrateurs" };

export default async function AdminsPage() {
  const me = await requireSuperAdmin();
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Administrateurs" subtitle="Les comptes administrateurs ne peuvent être créés qu'ici." />
      <Card title="Comptes" className="mb-5">
        <Table head={["Nom", "E-mail", "Rôle", "Créé le", "Dernière connexion", "Compte"]}>
          {admins.map((a) => (
            <tr key={a.id}>
              <Td>{fullName(a)}</Td>
              <Td>{a.email}</Td>
              <Td>{a.isSuperAdmin ? <Badge tone="blue">Super-admin</Badge> : "Admin"}</Td>
              <Td>{formatDate(a.createdAt)}</Td>
              <Td>{formatDateTime(a.lastLoginAt)}</Td>
              <Td>{a.id === me.id ? "Vous" : <UserStatusForm userId={a.id} status={a.status} />}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="Nouvel administrateur">
        <CreateAdminForm />
      </Card>
    </>
  );
}
