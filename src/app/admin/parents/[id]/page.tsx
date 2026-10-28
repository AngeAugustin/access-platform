import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader, Table, Td } from "@/components/ui";
import { TutoringBadge } from "@/components/status";
import { UserStatusForm } from "@/components/admin/forms";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Fiche parent" };

export default async function AdminParentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const p = await db.user.findFirst({
    where: { id, role: "PARENT" },
    include: {
      children: { orderBy: { firstName: "asc" } },
      parentTutorings: { include: { child: true, educator: { include: { user: true } } }, orderBy: { startDate: "desc" } },
      payments: { where: { status: "APPROVED" }, orderBy: { approvedAt: "desc" }, take: 20 },
    },
  });
  if (!p) notFound();
  return (
    <>
      <PageHeader
        back="/admin/parents"
        eyebrow="Fiche parent"
        title={
          <span className="flex items-center gap-3">
            <Avatar name={fullName(p)} size={48} />
            {fullName(p)}
          </span>
        }
        subtitle={p.status === "SUSPENDED" ? "Compte suspendu" : `${p.children.length} enfant(s) · ${p.parentTutorings.length} tutorat(s)`}
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Coordonnées">
            <DefinitionList
              items={[
                ["NPI", p.npi],
                ["E-mail", p.email],
                ["Téléphone", p.phone],
                ["Adresse", [p.address, p.city].filter(Boolean).join(", ") || "—"],
                ["Inscrit le", formatDate(p.createdAt)],
                ["Dernière connexion", formatDateTime(p.lastLoginAt)],
              ]}
            />
          </Card>
          <Card title={`Enfants (${p.children.length})`}>
            <ul className="divide-y divide-slate-100 text-sm">
              {p.children.map((c) => (
                <li key={c.id} className="py-2">
                  {fullName(c)} · {c.currentClass}
                  {c.currentSchool ? ` · ${c.currentSchool}` : ""}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Tutorats">
            <ul className="divide-y divide-slate-100 text-sm">
              {p.parentTutorings.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 py-2">
                  <Link href={`/admin/tutorats/${t.id}`} className="font-medium text-brand-700 hover:text-brand-800">
                    {fullName(t.child)} avec {fullName(t.educator.user)}
                  </Link>
                  <TutoringBadge status={t.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Compte">
            <UserStatusForm userId={p.id} status={p.status} />
          </Card>
          <Card title="Derniers paiements">
            {p.payments.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun.</p>
            ) : (
              <Table bare head={["Date", "Montant"]}>
                {p.payments.map((pay) => (
                  <tr key={pay.id}>
                    <Td>{formatDate(pay.approvedAt)}</Td>
                    <Td>{formatFcfa(pay.amount)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
