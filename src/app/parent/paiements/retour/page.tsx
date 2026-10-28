import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { syncTransaction } from "@/server/services/payments";
import { CircleCheck, CircleX, Clock, SearchX, TriangleAlert } from "lucide-react";
import { LinkButton, cx } from "@/components/ui";

export const metadata = { title: "Résultat du paiement" };

const messages = {
  approved: ["Paiement confirmé", "Merci ! Votre paiement est enregistré. Une confirmation vous a été envoyée par e-mail.", CircleCheck, "green"],
  already: ["Paiement confirmé", "Ce paiement est déjà enregistré.", CircleCheck, "green"],
  declined: ["Paiement non abouti", "La transaction a été refusée ou annulée. Aucun montant n'a été débité. Vous pouvez réessayer.", CircleX, "red"],
  pending: ["Paiement en cours de traitement", "FedaPay n'a pas encore confirmé la transaction. Le statut se mettra à jour automatiquement.", Clock, "amber"],
  unknown: ["Transaction inconnue", "Nous ne retrouvons pas cette transaction.", SearchX, "amber"],
  mismatch: ["Paiement à vérifier", "Le montant reçu ne correspond pas à l'échéance. L'équipe Access a été prévenue et revient vers vous.", TriangleAlert, "amber"],
} as const;

const tones = { green: "bg-emerald-50 text-emerald-600", red: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-600" } as const;

// Page de retour FedaPay : l'identifiant de transaction est relu auprès de FedaPay, jamais pris pour argent comptant.
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireRole("PARENT");
  const { id } = await searchParams;
  let result: keyof typeof messages = "unknown";
  if (id && /^\d{1,20}$/.test(id)) {
    const owned = await db.payment.findFirst({ where: { providerTransactionId: id, payerId: user.id } });
    if (owned) {
      try {
        result = await syncTransaction(id);
      } catch {
        result = "pending";
      }
    }
  }
  const [title, text, Icon, tone] = messages[result];
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-soft sm:mt-8">
      <span className={cx("mx-auto flex size-16 items-center justify-center rounded-full", tones[tone])} aria-hidden>
        <Icon className="size-8" strokeWidth={1.6} />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{text}</p>
      <LinkButton href="/parent/paiements" className="mt-8 w-full" size="lg">
        Retour aux paiements
      </LinkButton>
    </div>
  );
}
