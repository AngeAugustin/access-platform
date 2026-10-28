import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Client minimal de l'API REST FedaPay (https://docs.fedapay.com).
// Les clés ne sont lues que dans les variables d'environnement du serveur.

function baseUrl(): string {
  // FEDAPAY_API_BASE sert uniquement aux tests automatisés (serveur FedaPay simulé).
  if (process.env.FEDAPAY_API_BASE && process.env.FEDAPAY_ENV !== "live") return process.env.FEDAPAY_API_BASE;
  return process.env.FEDAPAY_ENV === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
}

export function fedapayConfigured(): boolean {
  return Boolean(process.env.FEDAPAY_SECRET_KEY);
}

export class FedapayError extends Error {}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) throw new FedapayError("Le paiement en ligne n'est pas configuré.");
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
    throw new FedapayError(`FedaPay : ${message}`);
  }
  return json as T;
}

export type FedapayTransaction = {
  id: number;
  status: "pending" | "approved" | "declined" | "canceled" | "refunded" | "transferred" | string;
  amount: number;
  custom_metadata?: Record<string, unknown> | null;
};

type Customer = { firstname: string; lastname: string; email: string; phone?: string };

function phoneNumber(phone?: string) {
  if (!phone) return undefined;
  const number = phone.replace(/^\+229/, "");
  return { number, country: "bj" };
}

export async function createTransaction(params: {
  amount: number;
  description: string;
  callbackUrl: string;
  customer: Customer;
  metadata: Record<string, string>;
}): Promise<{ id: number; url: string }> {
  const created = await call<{ "v1/transaction": FedapayTransaction }>("POST", "/transactions", {
    description: params.description,
    amount: params.amount,
    currency: { iso: "XOF" },
    callback_url: params.callbackUrl,
    custom_metadata: params.metadata,
    customer: {
      firstname: params.customer.firstname,
      lastname: params.customer.lastname,
      email: params.customer.email,
      phone_number: phoneNumber(params.customer.phone),
    },
  });
  const transaction = created["v1/transaction"];
  const token = await call<{ token: string; url: string }>("POST", `/transactions/${transaction.id}/token`);
  return { id: transaction.id, url: token.url };
}

// Source de vérité : l'état d'une transaction est toujours relu auprès de FedaPay,
// jamais déduit du seul contenu d'un webhook ou d'un paramètre d'URL.
export async function getTransaction(id: number | string): Promise<FedapayTransaction> {
  const res = await call<{ "v1/transaction": FedapayTransaction }>("GET", `/transactions/${encodeURIComponent(String(id))}`);
  return res["v1/transaction"];
}

export async function createAndStartPayout(params: {
  amount: number;
  customer: Customer;
  mode?: string;
}): Promise<{ id: number; status: string }> {
  const created = await call<{ "v1/payout": { id: number; status: string } }>("POST", "/payouts", {
    amount: params.amount,
    currency: { iso: "XOF" },
    mode: params.mode ?? process.env.FEDAPAY_PAYOUT_MODE ?? "mtn_open",
    customer: {
      firstname: params.customer.firstname,
      lastname: params.customer.lastname,
      email: params.customer.email,
      phone_number: phoneNumber(params.customer.phone),
    },
  });
  const payout = created["v1/payout"];
  await call("PUT", "/payouts/start", { payouts: [{ id: payout.id }] });
  return { id: payout.id, status: "started" };
}

export type FedapayPayout = { id: number; status: string; last_error_code?: string | null };

// Comme pour les transactions, l'état d'un reversement est toujours relu auprès de FedaPay.
export async function getPayout(id: number | string): Promise<FedapayPayout> {
  const res = await call<{ "v1/payout": FedapayPayout }>("GET", `/payouts/${encodeURIComponent(String(id))}`);
  return res["v1/payout"];
}

// Vérifie l'en-tête X-FEDAPAY-SIGNATURE : "t=<horodatage>,s=<signature>",
// signature = HMAC-SHA256(secret, "<horodatage>.<corps brut>"). Tolérance de 5 minutes.
export function verifyWebhookSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300): boolean {
  if (!header || !secret) return false;
  let timestamp = -1;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, ...rest] = part.split("=");
    const v = rest.join("=").trim();
    if (k.trim() === "t" && /^\d+$/.test(v)) timestamp = Number(v);
    if (k.trim() === "s") signatures.push(v);
  }
  if (timestamp < 0 || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex"));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
