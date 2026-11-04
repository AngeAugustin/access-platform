import { CircleCheck, Receipt, ShieldCheck, TriangleAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatFcfa, fullName } from "@/lib/format";
import { fedapayConfigured } from "@/server/services/fedapay";
import { EmptyState, Notice, cx } from "@/components/ui";
import { PayButton } from "@/components/parent/pay-button";
import { ScreenTitle, SectionHeading, darkPanel, display, panel } from "@/components/parent/kit";

export const metadata = { title: "Paiements" };

const METHODS = [
  { label: "MTN MoMo", dot: "bg-[#ffcc00]" },
  { label: "Moov Money", dot: "bg-[#0072bc]" },
  { label: "Carte", dot: "bg-slate-300" },
];

export default async function PaymentsPage() {
  const user = await requireRole("PARENT");
  const [installments, payments] = await Promise.all([
    db.installment.findMany({
      where: { tutoring: { parentId: user.id }, status: "PENDING" },
      include: { tutoring: { include: { child: true, educator: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
      orderBy: { dueDate: "asc" },
    }),
    db.payment.findMany({
      where: { payerId: user.id, status: "APPROVED" },
      include: { installment: { include: { tutoring: { include: { child: true } } } } },
      orderBy: { approvedAt: "desc" },
    }),
  ]);
  const now = new Date();
  const [first, ...others] = installments;
  const remaining = installments.reduce((s, i) => s + i.amount, 0);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <ScreenTitle eyebrow={remaining > 0 ? `Reste à payer : ${formatFcfa(remaining)}` : `Déjà payé : ${formatFcfa(paidTotal)}`} title="Paiements" />
      {!fedapayConfigured() && (
        <div className="mb-5">
          <Notice tone="amber" icon={TriangleAlert} title="Paiement en ligne indisponible">
            Le paiement en ligne n&apos;est pas encore activé sur ce serveur.
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          {first ? (
            <div className={cx(darkPanel, "p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cx("text-sm", first.dueDate < now ? "font-semibold text-rose-300" : "text-brand-200")}>
                  {first.dueDate < now ? "En retard depuis le" : "À payer avant le"} {formatDate(first.dueDate)}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">
                  {first.tutoring.child.firstName} · échéance {first.index}
                </span>
              </div>
              <p className={cx(display, "mt-2 text-[44px] leading-none font-extrabold tabular-nums")}>
                {new Intl.NumberFormat("fr-FR").format(first.amount)} <span className="text-[22px]">FCFA</span>
              </p>
              <p className="mt-1.5 text-13px text-brand-200">
                {first.weeks} semaines avec {first.tutoring.educator.user.firstName} {first.tutoring.educator.user.lastName.charAt(0)}.
              </p>
              <ul className="mt-5 grid grid-cols-3 gap-2" aria-label="Moyens de paiement acceptés">
                {METHODS.map((m) => (
                  <li key={m.label} className="flex h-12 flex-col items-center justify-center gap-1 rounded-2xl bg-white/10 text-xs font-semibold">
                    <span className={cx("size-3 rounded-full", m.dot)} aria-hidden />
                    {m.label}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <PayButton installmentId={first.id} label="Payer maintenant" large />
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-200">
                <ShieldCheck className="size-3.5" aria-hidden /> Paiement sécurisé par FedaPay · vous choisissez le moyen à l&apos;étape suivante
              </p>
            </div>
          ) : (
            <EmptyState icon={CircleCheck} title="Tout est réglé">
              Aucune échéance en attente.
            </EmptyState>
          )}

          {others.length > 0 && (
            <section aria-labelledby="t-ensuite">
              <SectionHeading id="t-ensuite">Ensuite</SectionHeading>
              <ul className="space-y-2">
                {others.map((i) => (
                  <li key={i.id} className={cx(panel, "flex items-center justify-between gap-3 p-3.5")}>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink tabular-nums">{formatFcfa(i.amount)}</p>
                      <p className={cx("text-xs", i.dueDate < now ? "font-medium text-rose-700" : "text-slate-500")}>
                        {i.tutoring.child.firstName} · échéance {i.index} · avant le {formatDate(i.dueDate)}
                      </p>
                    </div>
                    <PayButton installmentId={i.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="t-historique">
          <SectionHeading id="t-historique">Historique</SectionHeading>
          {payments.length === 0 ? (
            <p className={cx(panel, "p-5 text-sm text-slate-500")}>Aucun paiement pour le moment.</p>
          ) : (
            <ul className={cx(panel, "divide-y divide-slate-100 overflow-hidden")}>
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-emerald-50 text-emerald-600" aria-hidden>
                    <Receipt className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {fullName(p.installment.tutoring.child)} · échéance {p.installment.index}
                    </p>
                    <p className="truncate text-xs text-slate-500">{formatDateTime(p.approvedAt)}</p>
                    <p className="truncate font-mono text-11px text-slate-400">
                      {p.installment.reference} · FedaPay {p.providerTransactionId}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-ink tabular-nums">{formatFcfa(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
