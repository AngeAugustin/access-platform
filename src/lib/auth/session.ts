import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requestInfo } from "@/lib/request";

export const SESSION_COOKIE = "access_session";
const SESSION_DAYS = 7;
const RENEW_AFTER_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function setCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Crée une session neuve (nouveau jeton à chaque connexion : pas de fixation de session).
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const { ip, userAgent } = await requestInfo();
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, ip, userAgent } });
  await setCookie(token, expiresAt);
}

// Renvoie la session valide liée au cookie, ou null. Prolonge la session active une fois par jour.
export async function readSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, role: true, status: true, firstName: true, lastName: true, email: true, isSuperAdmin: true },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (Date.now() - session.lastUsedAt.getTime() > RENEW_AFTER_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date(), expiresAt } });
    // L'écriture du cookie n'est possible que dans une action serveur ou un gestionnaire de route.
    try {
      await setCookie(token, expiresAt);
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
