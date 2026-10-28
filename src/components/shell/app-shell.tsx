import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { Logo } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { InstallHint } from "@/components/pwa/install-hint";
import { Toaster } from "@/components/ui/toaster";
import { BottomNav, type NavItem, SideNav } from "./nav-links";
import { LogoutButton } from "./logout-button";

export async function AppShell({ user, items, root, children }: { user: CurrentUser; items: NavItem[]; root: string; children: ReactNode }) {
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <div className="min-h-dvh lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] flex-col border-r border-slate-200/80 bg-white lg:flex">
        <div className="flex h-16 items-center px-6">
          <Logo href={root} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SideNav items={items} root={root} />
        </div>
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Link href={`${root}/profil`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
              <Avatar name={name} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{name}</span>
                <span className="block truncate text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
              </span>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <Logo href={root} />
          </div>
          <p className="hidden items-center gap-2 text-sm text-slate-500 lg:flex">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
            Espace {ROLE_LABELS[user.role].toLowerCase()}
          </p>
          <div className="flex items-center gap-1.5">
            <Link
              href={`${root}/notifications`}
              className="relative flex size-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-ink"
              aria-label={`Notifications (${unread} non lues)`}
            >
              <Bell className="size-5" strokeWidth={1.8} aria-hidden />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link href={`${root}/profil`} className="rounded-full lg:hidden" aria-label="Mon profil">
              <Avatar name={name} size={34} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl animate-fade-in px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        <InstallHint />
        {children}
      </main>
      <BottomNav items={items} root={root} />
      <Toaster />
    </div>
  );
}
