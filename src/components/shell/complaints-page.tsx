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
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Nouvelle réclamation">
          <ComplaintForm />
        </Card>
        <div className="space-y-3">
          {complaints.length === 0 ? (
            <EmptyState title="Aucune réclamation." />
          ) : (
            complaints.map((c) => (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{c.subject}</p>
                  <Badge tone={tone[c.status]}>{COMPLAINT_STATUS[c.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">Déposée le {formatDate(c.createdAt)}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{c.details}</p>
                {c.response && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-900">Réponse d&apos;Access · {formatDate(c.handledAt)}</p>
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
