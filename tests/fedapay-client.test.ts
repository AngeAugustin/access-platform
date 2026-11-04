import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAndStartPayout, createTransaction, payoutModeFor } from "@/server/services/fedapay";

type Call = { method: string; path: string; body: Record<string, unknown> | undefined };

// Faux serveur FedaPay : chaque route renvoie la réponse prévue par le test, les appels sont enregistrés.
function fakeFedapay(routes: Record<string, (body?: Record<string, unknown>) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const path = url.replace("https://sandbox-api.fedapay.com/v1", "");
      const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
      calls.push({ method: init.method ?? "GET", path, body });
      const route = routes[`${init.method} ${path.split("?")[0]}`];
      const res = route ? route(body) : { status: 404, json: { message: "introuvable" } };
      return new Response(JSON.stringify(res.json), { status: res.status ?? 200 });
    }),
  );
  return calls;
}

const params = {
  amount: 15000,
  description: "Access ECH-1 — Kofi",
  callbackUrl: "http://localhost:3000/parent/paiements/retour",
  customer: { firstname: "Aïcha", lastname: "Adjovi", email: "aicha@example.com", phone: "+2290197000000" },
  metadata: { paymentId: "pay_1" },
};

const transaction = {
  "POST /transactions": () => ({ json: { "v1/transaction": { id: 77, status: "pending", amount: 15000 } } }),
  "POST /transactions/77/token": () => ({ json: { token: "t", url: "https://checkout/77" } }),
};

describe("createTransaction", () => {
  beforeEach(() => {
    vi.stubEnv("FEDAPAY_SECRET_KEY", "sk_sandbox_test");
    vi.stubEnv("FEDAPAY_ENV", "sandbox");
    vi.stubEnv("FEDAPAY_API_BASE", "");
    vi.stubEnv("FEDAPAY_PAYMENT_MODE", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("crée le client puis la transaction rattachée à son identifiant", async () => {
    const calls = fakeFedapay({ "POST /customers": () => ({ json: { "v1/customer": { id: 5 } } }), ...transaction });
    await expect(createTransaction(params)).resolves.toEqual({ id: 77, url: "https://checkout/77" });
    const tx = calls.find((c) => c.method === "POST" && c.path === "/transactions")!;
    expect(tx.body?.customer).toEqual({ id: 5 });
    expect(tx.body?.custom_metadata).toEqual({ paymentId: "pay_1" });
    expect(tx.body).not.toHaveProperty("mode");
  });

  it("réutilise le client existant quand FedaPay refuse l'e-mail en double", async () => {
    const calls = fakeFedapay({
      "POST /customers": () => ({ status: 400, json: { message: "Erreur", errors: { email: ["L'e-mail n'est pas disponible."] } } }),
      "GET /customers/search": () => ({ json: { "v1/customers": [{ id: 9, email: "AICHA@example.com" }] } }),
      "PUT /customers/9": () => ({ json: { "v1/customer": { id: 9 } } }),
      ...transaction,
    });
    await createTransaction(params);
    expect(calls.some((c) => c.method === "PUT" && c.path === "/customers/9")).toBe(true);
    expect(calls.find((c) => c.path === "/transactions")?.body?.customer).toEqual({ id: 9 });
  });

  it("transmet le moyen de paiement imposé par FEDAPAY_PAYMENT_MODE", async () => {
    vi.stubEnv("FEDAPAY_PAYMENT_MODE", "mtn_open");
    const calls = fakeFedapay({ "POST /customers": () => ({ json: { "v1/customer": { id: 5 } } }), ...transaction });
    await createTransaction(params);
    expect(calls.find((c) => c.path === "/transactions")?.body?.mode).toBe("mtn_open");
  });

  it("ne masque pas une autre erreur de création du client", async () => {
    fakeFedapay({ "POST /customers": () => ({ status: 401, json: { message: "Clé invalide" } }) });
    await expect(createTransaction(params)).rejects.toThrow("FedaPay : Clé invalide");
  });
});

describe("createAndStartPayout", () => {
  beforeEach(() => {
    vi.stubEnv("FEDAPAY_SECRET_KEY", "sk_sandbox_test");
    vi.stubEnv("FEDAPAY_ENV", "sandbox");
    vi.stubEnv("FEDAPAY_API_BASE", "");
    vi.stubEnv("FEDAPAY_PAYOUT_MODE", "mtn_open");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const payoutRoutes = {
    "POST /customers": () => ({ json: { "v1/customer": { id: 5 } } }),
    "POST /payouts": () => ({ json: { "v1/payout": { id: 31, status: "pending" } } }),
    "PUT /payouts/start": () => ({ json: {} }),
  };

  it("envoie le reversement vers l'opérateur choisi par l'éducateur", async () => {
    const calls = fakeFedapay(payoutRoutes);
    await createAndStartPayout({ amount: 17000, customer: params.customer, mode: payoutModeFor("MOOV") });
    expect(calls.find((c) => c.path === "/payouts")?.body?.mode).toBe("moov");
  });

  it("retombe sur FEDAPAY_PAYOUT_MODE quand l'opérateur n'est pas renseigné", async () => {
    const calls = fakeFedapay(payoutRoutes);
    await createAndStartPayout({ amount: 17000, customer: params.customer, mode: payoutModeFor(null) });
    expect(calls.find((c) => c.path === "/payouts")?.body?.mode).toBe("mtn_open");
  });
});

describe("createAndStartPayout sans droit de reversement", () => {
  beforeEach(() => {
    vi.stubEnv("FEDAPAY_SECRET_KEY", "sk_sandbox_test");
    vi.stubEnv("FEDAPAY_ENV", "sandbox");
    vi.stubEnv("FEDAPAY_API_BASE", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("explique qu'il faut faire activer les reversements quand FedaPay répond 403", async () => {
    fakeFedapay({
      "POST /customers": () => ({ json: { "v1/customer": { id: 5 } } }),
      "POST /payouts": () => ({ status: 403, json: { message: "Opération non autorisée" } }),
    });
    await expect(createAndStartPayout({ amount: 17000, customer: params.customer })).rejects.toThrow(/reversements ne sont pas activés/);
  });
});
