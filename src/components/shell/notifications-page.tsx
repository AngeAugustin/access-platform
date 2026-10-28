import Link from "next/link";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsRead } from "@/server/actions/notifications";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { PushToggle } from "@/components/pwa/push-toggle";

export async function NotificationsPage({ user }: { user: CurrentUser }) {
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} non lue(s)` : "Tout est lu."}
        action={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button className="text-sm font-semibold text-brand-700 hover:underline">Tout marquer comme lu</button>
            </form>
          )
        }
      />
      <Card className="mb-5">
        <PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
      </Card>
      {notifications.length === 0 ? (
        <EmptyState title="Aucune notification pour le moment." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={cx("rounded-xl border bg-white p-4", n.readAt ? "border-slate-200" : "border-brand-600")}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{n.title}</p>
                <time className="shrink-0 text-xs text-slate-500">{formatDateTime(n.createdAt)}</time>
              </div>
              <p className="mt-1 text-sm text-slate-700">{n.body}</p>
              {n.link && (
                <Link href={n.link} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
                  Voir →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
