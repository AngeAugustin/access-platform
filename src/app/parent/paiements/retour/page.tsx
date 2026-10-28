import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { syncTransaction } from "@/server/services/payments";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Résultat du paiement" };

const messages = {
  approved: ["Paiement confirmé", "Merci ! Votre paiement est enregistré. Un reçu vous a été envoyé par e-mail."],
  already: ["Paiement confirmé", "Ce paiement est déjà enregistré."],
  declined: ["Paiement non abouti", "La transaction a été refusée ou annulée. Aucun montant n'a été débité. Vous pouvez réessayer."],
  pending: ["Paiement en cours de traitement", "FedaPay n'a pas encore confirmé la transaction. Le statut se mettra à jour automatiquement."],
  unknown: ["Transaction inconnue", "Nous ne retrouvons pas cette transaction."],
  mismatch: ["Paiement à vérifier", "Le montant reçu ne correspond pas à l'échéance. L'équipe Access a été prévenue et revient vers vous."],
} as const;

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
  const [title, text] = messages[result];
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-slate-700">{text}</p>
        <LinkButton href="/parent/paiements" className="mt-4">
          Retour aux paiements
        </LinkButton>
      </Card>
    </>
  );
}
