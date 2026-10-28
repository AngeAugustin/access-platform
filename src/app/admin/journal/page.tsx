import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDateTime, fullName } from "@/lib/format";
import { PageHeader, Table, Td } from "@/components/ui";

export const metadata = { title: "Journal d'audit" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireRole("ADMIN");
  const { action } = await searchParams;
  const logs = await db.auditLog.findMany({
    where: action ? { action: { startsWith: action.slice(0, 60) } } : {},
    include: { actor: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Journal d'audit" subtitle="Connexions, validations, paiements, reversements : les 300 derniers événements." />
      <form method="get" className="mb-4">
        <input name="action" defaultValue={action ?? ""} placeholder="Filtrer par action (ex. payout, user.login)" className="field max-w-sm" aria-label="Action" />
      </form>
      <Table head={["Date", "Auteur", "Action", "Objet", "IP"]}>
        {logs.map((l) => (
          <tr key={l.id}>
            <Td className="whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
            <Td>{l.actor ? fullName(l.actor) : "Système"}</Td>
            <Td className="font-mono text-xs">{l.action}</Td>
            <Td className="font-mono text-xs">
              {l.entityType} {l.entityId}
            </Td>
            <Td className="font-mono text-xs">{l.ip}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
