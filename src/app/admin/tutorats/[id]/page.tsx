import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { TIME_SLOTS } from "@/lib/constants";
import { formatDate, formatFcfa, fullName } from "@/lib/format";
import { Card, DefinitionList, PageHeader, Table, Td } from "@/components/ui";
import { InstallmentBadge, LessonBadge, PayoutBadge, TutoringBadge } from "@/components/status";
import { AdminStopTutoringForm, DisputeForm } from "@/components/admin/forms";

export const metadata = { title: "Tutorat" };

export default async function AdminTutoringPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const t = await db.tutoring.findUnique({
    where: { id },
    include: {
      child: true,
      parent: true,
      educator: { include: { user: true } },
      lessons: { orderBy: [{ date: "desc" }] },
      installments: { orderBy: { index: "asc" }, include: { payout: true, payments: { where: { status: "APPROVED" } } } },
      review: true,
    },
  });
  if (!t) notFound();
  const now = new Date();
  return (
    <>
      <PageHeader back="/admin/tutorats" eyebrow={`Réf. ${t.reference}`} title={`${fullName(t.child)} avec ${fullName(t.educator.user)}`} subtitle={<TutoringBadge status={t.status} />} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Contrat">
          <DefinitionList
            items={[
              ["Statut", <TutoringBadge key="s" status={t.status} />],
              ["Élève", `${fullName(t.child)} (${t.classLevel})`],
              ["Parent", <Link key="p" href={`/admin/parents/${t.parentId}`} className="font-medium text-brand-700 hover:text-brand-800">{fullName(t.parent)}</Link>],
              ["Éducateur", <Link key="e" href={`/admin/educateurs/${t.educatorId}`} className="font-medium text-brand-700 hover:text-brand-800">{fullName(t.educator.user)}</Link>],
              ["Période", `${formatDate(t.startDate)} → ${formatDate(t.endDate)} (${t.durationWeeks} sem.)`],
              ["Créneaux", t.slotsLabel],
              ["Tarif", `${formatFcfa(t.hourlyRate)}/h · ${t.sessionsPerWeek} × ${t.hoursPerSession} h`],
              ["Arrêt", t.stoppedAt ? `${formatDate(t.stoppedAt)} — ${t.stopReason}` : "—"],
              ["Avis du parent", t.review ? `${t.review.rating}/5 ${t.review.comment ?? ""}` : "—"],
            ]}
          />
        </Card>
        <Card title="Action">{t.status === "ACTIVE" ? <AdminStopTutoringForm tutoringId={t.id} /> : <p className="text-sm text-slate-600">Tutorat clôturé.</p>}</Card>
        <Card title="Échéances et reversements" className="lg:col-span-2">
          <Table bare head={["#", "Semaines", "Montant", "Date limite", "Statut", "Payé le", "Reversement"]}>
            {t.installments.map((i) => (
              <tr key={i.id}>
                <Td>{i.index}</Td>
                <Td>{i.weeks}</Td>
                <Td className="whitespace-nowrap">{formatFcfa(i.amount)}</Td>
                <Td className="whitespace-nowrap">{formatDate(i.dueDate)}</Td>
                <Td>
                  <InstallmentBadge status={i.status} overdue={i.dueDate < now} />
                  {i.payments.length > 1 && <span className="ml-1 text-xs font-semibold text-rose-700">{i.payments.length} paiements !</span>}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(i.paidAt)}</Td>
                <Td>{i.payout ? <PayoutBadge status={i.payout.status} /> : "—"}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title={`Séances (${t.lessons.length})`} className="lg:col-span-2">
          <ul className="space-y-3">
            {t.lessons.map((l) => (
              <li key={l.id} className="rounded-2xl border border-slate-200/80 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {formatDate(l.date)} · {TIME_SLOTS[l.slot]}
                  </span>
                  <LessonBadge status={l.status} />
                </div>
                <p className="mt-1 whitespace-pre-line">{l.workDone}</p>
                {l.parentComment && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-700">Parent : {l.parentComment}</p>}
                {l.status === "DISPUTED" && <DisputeForm lessonId={l.id} />}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
