import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { LogoutButton } from "./logout-button";
import { BottomNav, type NavItem, SideNav } from "./nav-links";
import { InstallHint } from "@/components/pwa/install-hint";

export async function AppShell({ user, items, root, children }: { user: CurrentUser; items: NavItem[]; root: string; children: ReactNode }) {
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <Link href={root} className="mb-6 block text-xl font-bold text-brand-700">
          Access
        </Link>
        <SideNav items={items} root={root} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Link href={root} className="text-lg font-bold text-brand-700 lg:hidden">
            Access
          </Link>
          <p className="hidden text-sm text-slate-600 lg:block">
            {ROLE_LABELS[user.role]} · {user.firstName} {user.lastName}
          </p>
          <div className="flex items-center gap-2">
            <Link href={`${root}/notifications`} className="relative rounded-full p-2 hover:bg-slate-100" aria-label={`Notifications (${unread} non lues)`}>
              <span aria-hidden>🔔</span>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <Link href={`${root}/profil`} className="rounded-full p-2 hover:bg-slate-100" aria-label="Mon profil">
              <span aria-hidden>👤</span>
            </Link>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 lg:pb-10">
          <InstallHint />
          {children}
        </main>
      </div>
      <BottomNav items={items} root={root} />
    </div>
  );
}
