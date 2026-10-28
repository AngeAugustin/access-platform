import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id avec les paramètres recommandés par l'OWASP (19 Mio, 2 itérations).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Empreinte factice : vérifier contre elle quand le compte n'existe pas garde un temps de réponse constant.
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hash("mot-de-passe-factice", OPTIONS);
  await verifyPassword(await dummyHash, password);
}
