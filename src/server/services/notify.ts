import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { escapeHtml, sendMail } from "./mail";

let vapidReady: boolean | null = null;
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  vapidReady = Boolean(publicKey && privateKey);
  if (vapidReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@example.com", publicKey!, privateKey!);
  return vapidReady;
}

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  // Envoie aussi un e-mail (événements importants : validation de profil, paiement, échéance).
  email?: boolean;
};

// Notification dans l'application + push sur les appareils abonnés (+ e-mail si demandé).
// Les échecs d'envoi sont journalisés sans interrompre l'action métier.
export async function notify(input: NotificationInput): Promise<void> {
  await db.notification.create({
    data: { userId: input.userId, type: input.type, title: input.title, body: input.body, link: input.link },
  });

  const tasks: Promise<unknown>[] = [];

  if (ensureVapid()) {
    const subs = await db.pushSubscription.findMany({ where: { userId: input.userId } });
    const payload = JSON.stringify({ title: input.title, body: input.body, url: input.link ?? "/" });
    for (const sub of subs) {
      tasks.push(
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 86400 })
          .catch(async (err: { statusCode?: number }) => {
            // Abonnement expiré ou révoqué par le navigateur : on le supprime.
            if (err.statusCode === 404 || err.statusCode === 410) {
              await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            } else {
              console.error("[push] échec", err.statusCode);
            }
          }),
      );
    }
  }

  if (input.email) {
    const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true } });
    if (user) {
      const appUrl = process.env.APP_URL ?? "";
      const link = input.link
        ? `<p><a href="${escapeHtml(appUrl + input.link)}" style="color:#1d4ed8">Ouvrir Access</a></p>`
        : "";
      tasks.push(sendMail(user.email, input.title, input.title, `<p>${escapeHtml(input.body)}</p>${link}`));
    }
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId">): Promise<void> {
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await Promise.all(admins.map((a) => notify({ ...input, userId: a.id })));
}
