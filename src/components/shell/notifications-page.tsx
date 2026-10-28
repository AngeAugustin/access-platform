import Link from "next/link";
import { BellOff, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsRead } from "@/server/actions/notifications";
import { Card, EmptyState, PageHeader, buttonClass, cx } from "@/components/ui";
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
        subtitle={unread ? `${unread} non lue${unread > 1 ? "s" : ""}` : "Vous êtes à jour."}
        action={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button className={buttonClass("secondary", undefined, "sm")}>Tout marquer comme lu</button>
            </form>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="lg:order-2">
          <Card title="Sur cet appareil">
            <PushToggle vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
          </Card>
        </div>
        <div className="lg:order-1">
          {notifications.length === 0 ? (
            <EmptyState icon={BellOff} title="Aucune notification">
              Vous serez prévenu ici des nouvelles séances, paiements et réponses d&apos;Access.
            </EmptyState>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const body = (
                    <div className="flex gap-3.5">
                      <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className={cx("text-[15px]", n.readAt ? "font-medium text-slate-700" : "font-semibold text-ink")}>{n.title}</p>
                          <time className="shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt)}</time>
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{n.body}</p>
                      </div>
                      {n.link && <ChevronRight className="mt-1 size-4 shrink-0 self-center text-slate-300" aria-hidden />}
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} className="block px-5 py-4 transition hover:bg-slate-50 sm:px-6">
                          {body}
                        </Link>
                      ) : (
                        <div className="px-5 py-4 sm:px-6">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
