import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/server/services/fedapay";
import { syncTransaction } from "@/server/services/payments";

// Webhook FedaPay : signature vérifiée, événement traité une seule fois,
// et l'état de la transaction relu auprès de l'API FedaPay avant toute écriture.
export async function POST(request: Request) {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET ?? "";
  // Refus avant lecture du corps : un corps volumineux ne doit pas occuper la mémoire du serveur.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > 100_000) return new Response("Trop volumineux", { status: 413 });
  const payload = await request.text();
  if (payload.length > 100_000) return new Response("Trop volumineux", { status: 413 });
  if (!verifyWebhookSignature(payload, request.headers.get("x-fedapay-signature"), secret)) {
    return new Response("Signature invalide", { status: 400 });
  }

  let event: { id?: string | number; name?: string; entity?: { id?: number | string } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }
  const name = String(event.name ?? "");
  const transactionId = event.entity?.id;
  if (!name.startsWith("transaction.") || transactionId === undefined) {
    return Response.json({ received: true, ignored: true });
  }

  const eventId = String(event.id ?? `${name}:${transactionId}`);
  const already = await db.webhookEvent.findUnique({ where: { id: eventId } });
  if (already) return Response.json({ received: true, duplicate: true });

  try {
    const result = await syncTransaction(String(transactionId));
    // Enregistré seulement après un traitement réussi : FedaPay renverra l'événement en cas d'échec.
    await db.webhookEvent.create({ data: { id: eventId, provider: "fedapay", name } }).catch(() => {});
    return Response.json({ received: true, result });
  } catch (err) {
    console.error("[webhook fedapay]", err);
    return new Response("Erreur de traitement", { status: 500 });
  }
}
