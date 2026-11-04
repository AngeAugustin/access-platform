import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, CircleAlert, FileCheck, House, IdCard, LogIn, Mail, MapPin, MessageSquareWarning, Phone, Smile } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { COMPLAINT_STATUS } from "@/lib/constants";
import { age, formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { AccountManagement } from "@/components/admin/forms";
import { AccountBadge, accountSummary } from "@/components/status";
import { Avatar } from "@/components/avatar";
import { BackLink, ContactActions, DetailHeader, Empty, Info, MetaItem, Metric, PersonLink, TutoringRow } from "@/components/admin/detail";

export const metadata = { title: "Fiche parent" };

const complaintTones = { OPEN: "amber", IN_PROGRESS: "blue", RESOLVED: "green", REJECTED: "red" } as const;

export default async function AdminParentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const p = await db.user.findFirst({
    where: { id, role: "PARENT" },
    include: {
      children: { orderBy: { firstName: "asc" }, include: { _count: { select: { tutorings: { where: { status: "ACTIVE" } } } } } },
      parentTutorings: { include: { child: true, educator: { include: { user: { select: { firstName: true, lastName: true } } } } }, orderBy: { startDate: "desc" } },
      complaints: { orderBy: { createdAt: "desc" }, take: 10 },
      payments: { where: { status: "APPROVED" }, orderBy: { approvedAt: "desc" }, take: 8, include: { installment: { include: { tutoring: { include: { child: true } } } } } },
    },
  });
  if (!p) notFound();
  const [paid, pending] = await Promise.all([
    db.payment.aggregate({ where: { payerId: p.id, status: "APPROVED" }, _sum: { amount: true } }),
    db.installment.findMany({ where: { status: "PENDING", tutoring: { parentId: p.id } }, orderBy: { dueDate: "asc" }, include: { tutoring: { include: { child: true } } } }),
  ]);

  const now = new Date();
  const name = fullName(p);
  const overdue = pending.filter((i) => i.dueDate < now);
  const overdueAmount = overdue.reduce((s, i) => s + i.amount, 0);
  const next = pending.find((i) => i.dueDate >= now);
  const activeTutorings = p.parentTutorings.filter((t) => t.status === "ACTIVE").length;

  return (
    <>
      <BackLink href="/admin/parents">Parents</BackLink>
      <DetailHeader
        avatar={<Avatar name={name} size={72} />}
        title={name}
        badges={<AccountBadge status={p.status} lockedUntil={p.lockedUntil} />}
        meta={
          <>
            {p.city && <MetaItem icon={MapPin}>{p.city}</MetaItem>}
            <MetaItem icon={CalendarDays}>Inscrit le {formatDate(p.createdAt)}</MetaItem>
            <MetaItem icon={LogIn}>{p.lastLoginAt ? `Dernière connexion le ${formatDateTime(p.lastLoginAt)}` : "Jamais connecté"}</MetaItem>
          </>
        }
        actions={<ContactActions phone={p.phone} email={p.email} />}
        metrics={
          <>
            <Metric label="Enfants inscrits">{p.children.length}</Metric>
            <Metric label="Tutorats">
              {activeTutorings} <span className="text-sm font-normal text-slate-400">en cours · {p.parentTutorings.length} au total</span>
            </Metric>
            <Metric label="Total payé">
              {formatFcfa(paid._sum.amount ?? 0).replace(" FCFA", "")} <span className="text-sm font-normal text-slate-400">FCFA</span>
            </Metric>
            <Metric label="Échéances en retard" tone={overdue.length ? "red" : undefined}>
              {overdue.length}
              {overdue.length > 0 && <span className="text-sm font-normal"> · {formatFcfa(overdueAmount)}</span>}
            </Metric>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card title="Enfants">
            {p.children.length === 0 ? (
              <Empty icon={Smile} title="Aucun enfant inscrit" />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {p.children.map((c) => (
                  <PersonLink
                    key={c.id}
                    href={`/admin/eleves/${c.id}`}
                    name={fullName(c)}
                    meta={[c.currentClass, `${age(c.birthDate, now)} ans`, c.currentSchool].filter(Boolean).join(" · ")}
                    trailing={
                      c._count.tutorings > 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Suivi en cours</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Sans tutorat</span>
                      )
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Tutorats">
            {p.parentTutorings.length === 0 ? (
              <Empty icon={BookOpenCheck} title="Aucun tutorat">
                Les tutorats demandés par ce parent apparaîtront ici.
              </Empty>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {p.parentTutorings.map((t) => (
                  <TutoringRow
                    key={t.id}
                    tutoring={t}
                    now={now}
                    person={fullName(t.educator.user)}
                    title={`${t.child.firstName} avec ${fullName(t.educator.user)}`}
                    meta={`${t.classLevel} · ${t.slotsLabel} · ${t.reference}`}
                  />
                ))}
              </ul>
            )}
          </Card>

          {p.complaints.length > 0 && (
            <Card title="Réclamations">
              <ul className="-my-2 divide-y divide-slate-100">
                {p.complaints.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/reclamations/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-slate-50">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600" aria-hidden>
                        <MessageSquareWarning className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{c.subject}</p>
                        <p className="text-13px text-slate-500">Ouverte le {formatDate(c.createdAt)}</p>
                      </div>
                      <Badge tone={complaintTones[c.status]}>{COMPLAINT_STATUS[c.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title="Paiements">
            {overdue.length > 0 && (
              <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
                <div>
                  <p className="font-semibold">{formatFcfa(overdueAmount)} en retard</p>
                  <ul className="mt-0.5 text-13px">
                    {overdue.map((i) => (
                      <li key={i.id}>
                        Échéance {i.index} du tutorat de {i.tutoring.child.firstName}, due le {formatDate(i.dueDate)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {next ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
                <span className="text-slate-500">Prochaine échéance</span>
                <span className="text-right font-medium text-ink">
                  {formatFcfa(next.amount)} · {formatDate(next.dueDate)}
                </span>
              </div>
            ) : (
              overdue.length === 0 && <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-500">Aucune échéance à venir.</p>
            )}
            <h3 className="mt-5 text-xs font-medium tracking-wide text-slate-500 uppercase">Derniers paiements</h3>
            {p.payments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucun paiement.</p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-100 text-sm">
                {p.payments.map((pay) => (
                  <li key={pay.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium text-ink tabular-nums">{formatFcfa(pay.amount)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(pay.approvedAt)} · Échéance {pay.installment.index} · {pay.installment.tutoring.child.firstName}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-emerald-700">Payé</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Coordonnées">
            <dl className="space-y-3 text-sm">
              <Info icon={IdCard} label="NPI" value={<span className="tabular-nums">{p.npi}</span>} />
              <Info icon={Mail} label="E-mail" value={p.email} />
              <Info icon={Phone} label="Téléphone" value={p.phone} />
              <Info icon={House} label="Adresse" value={[p.address, p.city].filter(Boolean).join(", ") || "—"} />
              <Info icon={FileCheck} label="Conditions" value={p.acceptedTermsAt ? `Acceptées le ${formatDate(p.acceptedTermsAt)}` : "Non acceptées"} />
            </dl>
          </Card>

          <Card>
            <h2 className="text-15px font-semibold tracking-tight text-ink">Compte</h2>
            <p className="mt-0.5 mb-4 text-13px text-slate-500">{accountSummary(p.status, p.lockedUntil)}</p>
            <AccountManagement userId={p.id} status={p.status} lockedUntil={p.lockedUntil} />
          </Card>
        </aside>
      </div>
    </>
  );
}
