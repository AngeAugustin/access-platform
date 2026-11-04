import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui";
import { AccountBadge } from "@/components/status";
import { AccountManagement, CreateAdminForm } from "@/components/admin/forms";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/pagination";

export const metadata = { title: "Administrateurs" };

export default async function AdminsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const me = await requireSuperAdmin();
  const info = paginate(await db.user.count({ where: { role: "ADMIN" } }), (await searchParams).page);
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, skip: info.skip, take: info.take });
  return (
    <>
      <PageHeader title="Administrateurs" subtitle="Les comptes administrateurs ne peuvent être créés qu'ici." />
      <Card title="Comptes" className="mb-5">
        <Table bare head={["Nom", "E-mail", "Rôle", "Créé le", "Dernière connexion", "État", "Compte"]}>
          {admins.map((a) => (
            <tr key={a.id}>
              <Td>{fullName(a)}</Td>
              <Td>{a.email}</Td>
              <Td>{a.isSuperAdmin ? <Badge tone="blue">Super-admin</Badge> : "Admin"}</Td>
              <Td>{formatDate(a.createdAt)}</Td>
              <Td>{formatDateTime(a.lastLoginAt)}</Td>
              <Td>
                <AccountBadge status={a.status} lockedUntil={a.lockedUntil} />
              </Td>
              <Td>{a.id === me.id ? "Vous" : <AccountManagement userId={a.id} status={a.status} lockedUntil={a.lockedUntil} />}</Td>
            </tr>
          ))}
        </Table>
        <Pagination info={info} path="/admin/administrateurs" label="administrateur" />
      </Card>
      <Card title="Nouvel administrateur">
        <CreateAdminForm />
      </Card>
    </>
  );
}
