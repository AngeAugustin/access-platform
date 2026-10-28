import { MessagesSquare } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { COMPLAINT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ComplaintForm } from "./complaint-form";

const tone = { OPEN: "amber", IN_PROGRESS: "blue", RESOLVED: "green", REJECTED: "red" } as const;

export async function ComplaintsPage({ user }: { user: CurrentUser }) {
  const complaints = await db.complaint.findMany({ where: { authorId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Réclamations" subtitle="Un souci avec un tutorat, un paiement ou l'application ? L'équipe Access vous répond ici." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card title="Nouvelle réclamation" className="h-fit">
          <ComplaintForm />
        </Card>
        <div className="space-y-4">
          {complaints.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="Aucune réclamation">
              Vos demandes et les réponses d&apos;Access apparaîtront ici.
            </EmptyState>
          ) : (
            complaints.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{c.subject}</p>
                    <p className="text-[13px] text-slate-500">Déposée le {formatDate(c.createdAt)}</p>
                  </div>
                  <Badge tone={tone[c.status]}>{COMPLAINT_STATUS[c.status]}</Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-slate-600">{c.details}</p>
                {c.response && (
                  <div className="mt-4 rounded-xl border-l-2 border-brand-500 bg-brand-50/60 px-4 py-3 text-sm">
                    <p className="font-medium text-brand-900">Réponse d&apos;Access · {formatDate(c.handledAt)}</p>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{c.response}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
