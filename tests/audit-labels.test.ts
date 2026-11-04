import { describe, expect, it } from "vitest";
import { actionsFor, describeAudit } from "@/lib/audit-labels";

describe("describeAudit", () => {
  it("traduit une action et ses détails", () => {
    const d = describeAudit("user.login_failed", { attempt: 3 });
    expect(d.title).toBe("Mot de passe erroné");
    expect(d.details).toBe("Tentative 3 sur 5 avant verrouillage");
    expect(d.alert).toBe(true);
  });

  it("formate les montants d'une anomalie", () => {
    expect(describeAudit("payment.amount_mismatch", { paid: 5000, expected: 12000 }).details).toMatch(/5\s000 FCFA reçus au lieu de 12\s000 FCFA/);
  });

  it("garde le code d'une action inconnue et tolère des métadonnées absentes", () => {
    expect(describeAudit("foo.bar", null).title).toBe("foo.bar");
    expect(describeAudit("educator.validate", null).details).toBeNull();
  });

  it("liste les actions d'un filtre", () => {
    expect(actionsFor("alertes")).toContain("user.locked");
    expect(actionsFor("acces")).toContain("user.login");
    expect(actionsFor("acces")).not.toContain("payment.approved");
  });
});
