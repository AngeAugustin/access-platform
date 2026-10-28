// Traduction des statuts de reversement FedaPay vers les statuts Access.
// « sent » est le seul statut qui confirme l'arrivée des fonds sur le compte Mobile Money.
export type PayoutOutcome = "DONE" | "FAILED" | "PROCESSING";

const FAILED = new Set(["failed", "canceled", "cancelled", "declined", "refunded", "rejected"]);

export function payoutOutcome(remoteStatus: string | null | undefined): PayoutOutcome {
  const status = (remoteStatus ?? "").toLowerCase();
  if (status === "sent") return "DONE";
  if (FAILED.has(status)) return "FAILED";
  return "PROCESSING";
}
