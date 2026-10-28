import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/server/services/fedapay";

const secret = "secret-de-test-webhook";
const payload = JSON.stringify({ name: "transaction.approved", entity: { id: 42 } });
const sign = (t: number, body = payload, key = secret) => createHmac("sha256", key).update(`${t}.${body}`).digest("hex");

describe("verifyWebhookSignature", () => {
  const now = Math.floor(Date.now() / 1000);

  it("accepte une signature valide", () => {
    expect(verifyWebhookSignature(payload, `t=${now},s=${sign(now)}`, secret)).toBe(true);
  });
  it("refuse un corps modifié", () => {
    expect(verifyWebhookSignature(payload.replace("42", "43"), `t=${now},s=${sign(now)}`, secret)).toBe(false);
  });
  it("refuse un autre secret", () => {
    expect(verifyWebhookSignature(payload, `t=${now},s=${sign(now, payload, "autre")}`, secret)).toBe(false);
  });
  it("refuse un horodatage hors tolérance (rejeu)", () => {
    const old = now - 3600;
    expect(verifyWebhookSignature(payload, `t=${old},s=${sign(old)}`, secret)).toBe(false);
  });
  it("refuse un en-tête absent ou mal formé, ou un secret vide", () => {
    expect(verifyWebhookSignature(payload, null, secret)).toBe(false);
    expect(verifyWebhookSignature(payload, "n'importe quoi", secret)).toBe(false);
    expect(verifyWebhookSignature(payload, `t=${now},s=${sign(now)}`, "")).toBe(false);
  });
});
