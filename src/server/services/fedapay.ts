import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Client minimal de l'API REST FedaPay (https://docs.fedapay.com).
// Les clés ne sont lues que dans les variables d'environnement du serveur.

// FEDAPAY_ENVIRONMENT est accepté comme dans les autres projets ; toute autre valeur que « live » vaut sandbox.
function isLive(): boolean {
  return (process.env.FEDAPAY_ENV ?? process.env.FEDAPAY_ENVIRONMENT ?? "").trim().toLowerCase() === "live";
}

function baseUrl(): string {
  // FEDAPAY_API_BASE sert uniquement aux tests automatisés (serveur FedaPay simulé).
  if (process.env.FEDAPAY_API_BASE && !isLive()) return process.env.FEDAPAY_API_BASE;
  return isLive() ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1";
}

export function fedapayConfigured(): boolean {
  return Boolean(process.env.FEDAPAY_SECRET_KEY);
}

export class FedapayError extends Error {
  constructor(
    message: string,
    readonly status = 0,
    readonly errors: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env.FEDAPAY_SECRET_KEY?.trim();
  if (!key) throw new FedapayError("Le paiement en ligne n'est pas configuré.");
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };
  // Compte FedaPay explicite, utile quand la clé donne accès à plusieurs comptes.
  const account = process.env.FEDAPAY_ACCOUNT_ID?.trim();
  if (account) headers["FedaPay-Account"] = account;
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message = typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
    const errors = json.errors && typeof json.errors === "object" ? (json.errors as Record<string, unknown>) : {};
    throw new FedapayError(`FedaPay : ${message}`, res.status, errors);
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

type CustomerRow = { id?: number | string; email?: string };

// Les listes FedaPay arrivent sous « v1/customers », « customers » ou « data » selon la route.
function customerRows(json: Record<string, unknown>): CustomerRow[] {
  const list = json["v1/customers"] ?? json.customers ?? json.data;
  return Array.isArray(list) ? (list as CustomerRow[]) : [];
}

async function findCustomerId(email: string): Promise<number | null> {
  const qs = new URLSearchParams({ "filter[email]": email });
  for (const path of [`/customers/search?${qs}`, `/customers?${qs}`]) {
    const json = await call<Record<string, unknown>>("GET", path).catch(() => null);
    if (!json) continue;
    const rows = customerRows(json);
    const match = rows.find((c) => c.email?.toLowerCase() === email.toLowerCase()) ?? (rows.length === 1 ? rows[0] : undefined);
    const id = Number(match?.id);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

function isDuplicateEmail(err: unknown): boolean {
  if (!(err instanceof FedapayError) || (err.status !== 400 && err.status !== 422)) return false;
  const email = err.errors.email;
  return Array.isArray(email) && email.some((m) => /disponible|already|unique|taken|existe/i.test(String(m)));
}

// FedaPay refuse deux clients avec le même e-mail : on réutilise celui qui existe déjà,
// en remettant à jour son nom et son numéro (le numéro sert de destination aux reversements).
async function findOrCreateCustomer(customer: Customer): Promise<number> {
  const body = {
    firstname: customer.firstname,
    lastname: customer.lastname,
    email: customer.email,
    phone_number: phoneNumber(customer.phone),
  };
  try {
    const created = await call<{ "v1/customer": { id: number } }>("POST", "/customers", body);
    return created["v1/customer"].id;
  } catch (err) {
    if (!isDuplicateEmail(err)) throw err;
    const id = await findCustomerId(customer.email.trim());
    if (id === null) throw new FedapayError("Ce client existe déjà chez FedaPay mais n'a pas pu être retrouvé. Réessayez plus tard.");
    await call("PUT", `/customers/${id}`, body);
    return id;
  }
}

export async function createTransaction(params: {
  amount: number;
  description: string;
  callbackUrl: string;
  customer: Customer;
  metadata: Record<string, string>;
}): Promise<{ id: number; url: string }> {
  const customerId = await findOrCreateCustomer(params.customer);
  // Sans mode imposé, la page FedaPay propose tous les moyens de paiement activés sur le compte.
  const mode = process.env.FEDAPAY_PAYMENT_MODE?.trim();
  const created = await call<{ "v1/transaction": FedapayTransaction }>("POST", "/transactions", {
    description: params.description.slice(0, 500),
    amount: params.amount,
    currency: { iso: "XOF" },
    callback_url: params.callbackUrl,
    custom_metadata: params.metadata,
    customer: { id: customerId },
    ...(mode ? { mode } : {}),
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

// Mode FedaPay de chaque opérateur Mobile Money (Bénin). Sans opérateur connu : FEDAPAY_PAYOUT_MODE.
const PAYOUT_MODES = { MTN: "mtn_open", MOOV: "moov" } as const;

export function payoutModeFor(operator: keyof typeof PAYOUT_MODES | null | undefined): string | undefined {
  return operator ? PAYOUT_MODES[operator] : undefined;
}

export async function createAndStartPayout(params: {
  amount: number;
  customer: Customer;
  mode?: string;
}): Promise<{ id: number; status: string }> {
  const customerId = await findOrCreateCustomer(params.customer);
  const created = await call<{ "v1/payout": { id: number; status: string } }>("POST", "/payouts", {
    amount: params.amount,
    currency: { iso: "XOF" },
    mode: params.mode ?? process.env.FEDAPAY_PAYOUT_MODE ?? "mtn_open",
    customer: { id: customerId },
  }).catch((err) => {
    // 403 : la clé est valide mais le compte n'a pas le droit d'effectuer des reversements.
    if (err instanceof FedapayError && err.status === 403) {
      throw new FedapayError("FedaPay : les reversements ne sont pas activés sur ce compte. Demandez leur activation à FedaPay.", 403);
    }
    throw err;
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
