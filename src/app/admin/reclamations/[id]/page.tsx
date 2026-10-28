import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { COMPLAINT_STATUS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader } from "@/components/ui";
import { ComplaintHandlingForm } from "@/components/admin/forms";

export const metadata = { title: "Réclamation" };

export default async function AdminComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const c = await db.complaint.findUnique({ where: { id }, include: { author: true, handledBy: true } });
  if (!c) notFound();
  return (
    <>
      <PageHeader title={c.subject} back="/admin/reclamations" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Demande">
          <DefinitionList
            items={[
              ["Demandeur", `${fullName(c.author)} (${ROLE_LABELS[c.author.role]})`],
              ["Contact", `${c.author.email} · ${c.author.phone}`],
              ["Déposée le", formatDateTime(c.createdAt)],
              ["Statut", COMPLAINT_STATUS[c.status]],
              ["Traitée par", c.handledBy ? `${fullName(c.handledBy)} le ${formatDateTime(c.handledAt)}` : "—"],
            ]}
          />
          <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{c.details}</p>
        </Card>
        <Card title="Réponse">
          <ComplaintHandlingForm complaintId={c.id} defaults={{ status: c.status, response: c.response ?? "" }} />
        </Card>
      </div>
    </>
  );
}
