"use server";

import { newChallenge } from "@/lib/pow";
import type { PowPurpose } from "@/lib/pow-core";

const PURPOSES: PowPurpose[] = ["login", "register", "forgot"];

// Délivre un défi anti-robot. La difficulté est fixée par le serveur, jamais par le client.
export async function getPowChallenge(purpose: PowPurpose) {
  if (!PURPOSES.includes(purpose)) throw new Error("Objet inconnu.");
  const { token, salt, bits, expiresAt } = newChallenge(purpose);
  return { token, salt, bits, expiresAt };
}
