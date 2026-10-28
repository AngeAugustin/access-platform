"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
