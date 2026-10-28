import { describe, expect, it } from "vitest";
import { clientIpFrom } from "@/lib/client-ip";

const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe("clientIpFrom", () => {
  it("sans proxy de confiance, ignore les en-têtes (forgeables)", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "1.2.3.4" }), { trustedProxyCount: 0 })).toBe("inconnue");
  });

  it("avec un proxy, prend l'adresse ajoutée par ce proxy et ignore celles forgées par le client", () => {
    // Le client envoie « 6.6.6.6 », le proxy ajoute l'adresse réelle 41.85.1.2.
    const get = headers({ "x-forwarded-for": "6.6.6.6, 41.85.1.2" });
    expect(clientIpFrom(get, { trustedProxyCount: 1 })).toBe("41.85.1.2");
  });

  it("avec deux proxys, remonte d'un cran", () => {
    const get = headers({ "x-forwarded-for": "6.6.6.6, 41.85.1.2, 10.0.0.5" });
    expect(clientIpFrom(get, { trustedProxyCount: 2 })).toBe("41.85.1.2");
  });

  it("utilise l'en-tête dédié quand il est configuré", () => {
    const get = headers({ "cf-connecting-ip": "2c0f:f5c0::1", "x-forwarded-for": "6.6.6.6" });
    expect(clientIpFrom(get, { trustedProxyCount: 1, ipHeader: "cf-connecting-ip" })).toBe("2c0f:f5c0::1");
  });

  it("rejette les valeurs qui ne sont pas des adresses", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "<script>" }), { trustedProxyCount: 1 })).toBe("inconnue");
    expect(clientIpFrom(headers({}), { trustedProxyCount: 1 })).toBe("inconnue");
  });
});
