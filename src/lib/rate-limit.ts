import "server-only";
import { db } from "@/lib/db";

// Compteurs à fenêtre fixe stockés en base : fonctionnent avec plusieurs instances du serveur.

// Incrémente le compteur et renvoie sa nouvelle valeur.
export async function hit(key: string, windowSeconds: number): Promise<number> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"`;
  return rows[0].count;
}

// Valeur courante du compteur, sans l'incrémenter.
export async function peek(key: string): Promise<number> {
  const row = await db.rateLimit.findUnique({ where: { key } });
  return row && row.resetAt > new Date() ? row.count : 0;
}

export async function reset(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}

// Renvoie true tant que la limite n'est pas dépassée.
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return (await hit(key, windowSeconds)) <= limit;
}

// Les limites par adresse IP n'ont de sens que si l'adresse est connue (proxy de confiance configuré).
export async function rateLimitIp(prefix: string, ip: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (ip === "inconnue") return true;
  return rateLimit(`${prefix}:ip:${ip}`, limit, windowSeconds);
}
