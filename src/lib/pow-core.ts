import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Vérification anti-robot par preuve de travail (sans service tiers).
// Le serveur délivre un défi signé ; le navigateur cherche un nombre n tel que
// SHA-256("<sel>:<n>") commence par `bits` bits à zéro. Résoudre coûte quelques secondes de calcul
// à un robot qui enchaîne les tentatives, et reste invisible pour une personne.

export type PowPurpose = "login" | "register" | "forgot";

type Payload = { p: PowPurpose; s: string; b: number; e: number };

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function issueChallenge(purpose: PowPurpose, bits: number, secret: string, ttlMs = 10 * 60 * 1000, now = Date.now()) {
  const payload: Payload = { p: purpose, s: randomBytes(16).toString("hex"), b: bits, e: now + ttlMs };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${data}.${sign(data, secret)}`, salt: payload.s, bits, expiresAt: payload.e };
}

export function leadingZeroBits(hash: Buffer): number {
  let count = 0;
  for (const byte of hash) {
    if (byte === 0) {
      count += 8;
      continue;
    }
    count += Math.clz32(byte) - 24;
    break;
  }
  return count;
}

export type PowCheck = { ok: true; salt: string; expiresAt: number } | { ok: false; reason: string };

// Contrôle la forme, la signature, l'objet, l'expiration et la difficulté. L'usage unique est vérifié à part (en base).
export function checkSolution(solution: unknown, purpose: PowPurpose, minBits: number, secret: string, now = Date.now()): PowCheck {
  if (typeof solution !== "string" || solution.length > 600) return { ok: false, reason: "absente" };
  const [token, nonce] = solution.split("~");
  if (!token || !nonce || !/^\d{1,12}$/.test(nonce)) return { ok: false, reason: "malformée" };
  const [data, signature] = token.split(".");
  if (!data || !signature) return { ok: false, reason: "malformée" };
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return { ok: false, reason: "malformée" };
  }
  if (payload.p !== purpose) return { ok: false, reason: "objet" };
  if (payload.e < now) return { ok: false, reason: "expirée" };
  if (payload.b < minBits) return { ok: false, reason: "difficulté" };
  const hash = createHash("sha256").update(`${payload.s}:${nonce}`).digest();
  if (leadingZeroBits(hash) < payload.b) return { ok: false, reason: "calcul" };
  return { ok: true, salt: payload.s, expiresAt: payload.e };
}

// Résolution côté serveur, utilisée par les tests.
export function solveSync(salt: string, bits: number): number {
  for (let n = 0; ; n++) {
    if (leadingZeroBits(createHash("sha256").update(`${salt}:${n}`).digest()) >= bits) return n;
  }
}
