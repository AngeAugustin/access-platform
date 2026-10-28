import { describe, expect, it } from "vitest";
import { payoutOutcome } from "@/lib/payout-status";

describe("payoutOutcome", () => {
  it("seul « sent » confirme l'envoi des fonds", () => {
    expect(payoutOutcome("sent")).toBe("DONE");
    expect(payoutOutcome("SENT")).toBe("DONE");
  });
  it("les statuts d'échec rendent le reversement relançable", () => {
    for (const s of ["failed", "canceled", "cancelled", "declined", "rejected"]) expect(payoutOutcome(s)).toBe("FAILED");
  });
  it("tout autre statut reste en cours (jamais confirmé par défaut)", () => {
    for (const s of ["pending", "started", "processing", "scheduled", "", undefined, null, "inconnu"]) expect(payoutOutcome(s)).toBe("PROCESSING");
  });
});
