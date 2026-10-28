import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { COMPLAINT_STATUS, ROLE_LABELS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { Badge, EmptyState, PageHeader, Table, Td } from "@/components/ui";

export const metadata = { title: "Réclamations" };
const tone = { OPEN: "amber", IN_PROGRESS: "blue", RESOLVED: "green", REJECTED: "red" } as const;

export default async function AdminComplaintsPage() {
  await requireRole("ADMIN");
  const complaints = await db.complaint.findMany({ include: { author: true }, orderBy: { createdAt: "desc" }, take: 300 });
  const order = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, REJECTED: 3 };
  complaints.sort((a, b) => order[a.status] - order[b.status]);
  return (
    <>
      <PageHeader title="Réclamations" subtitle="Les réclamations ouvertes sont en tête de liste." />
      {complaints.length === 0 ? (
        <EmptyState title="Aucune réclamation." />
      ) : (
        <Table head={["Date", "Demandeur", "Motif", "Statut"]}>
          {complaints.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <Td className="whitespace-nowrap">{formatDate(c.createdAt)}</Td>
              <Td>
                {fullName(c.author)} <span className="text-xs text-slate-500">({ROLE_LABELS[c.author.role]})</span>
              </Td>
              <Td>
                <Link href={`/admin/reclamations/${c.id}`} className="text-brand-700 hover:underline">
                  {c.subject}
                </Link>
              </Td>
              <Td>
                <Badge tone={tone[c.status]}>{COMPLAINT_STATUS[c.status]}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
