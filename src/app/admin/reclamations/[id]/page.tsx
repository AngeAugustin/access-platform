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
      <PageHeader back="/admin/reclamations" eyebrow="Réclamation" title={c.subject} subtitle={`${fullName(c.author)} · ${formatDateTime(c.createdAt)}`} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
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
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{c.details}</p>
        </Card>
        <Card title="Réponse">
          <ComplaintHandlingForm complaintId={c.id} defaults={{ status: c.status, response: c.response ?? "" }} />
        </Card>
      </div>
    </>
  );
}
