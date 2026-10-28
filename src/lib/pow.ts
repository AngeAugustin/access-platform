import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { checkSolution, issueChallenge, type PowPurpose } from "@/lib/pow-core";

// Difficulté en bits : environ 2^bits essais de hachage pour le navigateur.
export const POW_BITS = { register: 15, forgot: 15, login: 18 } as const satisfies Record<PowPurpose, number>;

let devSecret: string | null = null;
function secret(): string {
  const value = process.env.POW_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("POW_SECRET (32 caractères minimum) doit être défini en production.");
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

export function newChallenge(purpose: PowPurpose) {
  return issueChallenge(purpose, POW_BITS[purpose], secret());
}

// Vérifie la solution et la consomme : une même solution ne peut servir qu'une fois.
export async function verifyPow(solution: FormDataEntryValue | null, purpose: PowPurpose): Promise<boolean> {
  const check = checkSolution(solution, purpose, POW_BITS[purpose], secret());
  if (!check.ok) return false;
  try {
    await db.rateLimit.create({ data: { key: `pow:${check.salt}`, count: 1, resetAt: new Date(check.expiresAt) } });
    return true;
  } catch {
    return false; // déjà utilisée
  }
}
