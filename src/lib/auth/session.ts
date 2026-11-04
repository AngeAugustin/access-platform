import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requestInfo } from "@/lib/request";
import { isLocked } from "./lockout";

export const SESSION_COOKIE = "access_session";
const SESSION_DAYS = 7;
// Session non mémorisée : le cookie disparaît à la fermeture du navigateur, et la session après 12 h d'inactivité.
const SHORT_SESSION_HOURS = 12;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;
const SHORT_RENEW_AFTER_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionEnd(persistent: boolean) {
  return new Date(Date.now() + (persistent ? SESSION_DAYS * 24 : SHORT_SESSION_HOURS) * 60 * 60 * 1000);
}

// Sans `expires`, le navigateur garde le cookie jusqu'à sa fermeture.
async function setCookie(token: string, expiresAt: Date | undefined) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Crée une session neuve (nouveau jeton à chaque connexion : pas de fixation de session).
export async function createSession(userId: string, persistent = true) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = sessionEnd(persistent);
  const { ip, userAgent } = await requestInfo();
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, persistent, ip, userAgent } });
  await setCookie(token, persistent ? expiresAt : undefined);
}

// Renvoie la session valide liée au cookie, ou null. Prolonge la session active une fois par jour
// (une fois par heure pour une session non mémorisée).
export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          status: true,
          lockedUntil: true,
          mustChangePassword: true,
          firstName: true,
          lastName: true,
          email: true,
          isSuperAdmin: true,
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.status !== "ACTIVE" || isLocked(session.user.lockedUntil)) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (Date.now() - session.lastUsedAt.getTime() > (session.persistent ? RENEW_AFTER_MS : SHORT_RENEW_AFTER_MS)) {
    const expiresAt = sessionEnd(session.persistent);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), expiresAt } });
    // L'écriture du cookie n'est possible que dans une action serveur ou un gestionnaire de route.
    try {
      await setCookie(token, session.persistent ? expiresAt : undefined);
    } catch {}
  }
  return session;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}
