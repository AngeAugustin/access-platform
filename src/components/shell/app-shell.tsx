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
import { cx } from "@/components/ui";
import { BottomNav, type NavItem, SideNav } from "./nav-links";
import { LogoutButton } from "./logout-button";

// `wide` : back-office, tableaux et listes profitent de toute la largeur ; marges latérales réduites.
// `floatingNav` : barre d'onglets mobile en pilule sombre (espace parent).
export async function AppShell({
  user,
  items,
  root,
  wide = false,
  floatingNav = false,
  children,
}: {
  user: CurrentUser;
  items: NavItem[];
  root: string;
  wide?: boolean;
  floatingNav?: boolean;
  children: ReactNode;
}) {
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const name = `${user.firstName} ${user.lastName}`;
  const frame = wide ? "max-w-screen-2xl px-4 sm:px-5 lg:px-6" : "max-w-6xl px-4 sm:px-6 lg:px-8";
  return (
    <>
      {/* overflow-x-clip : aucun contenu (texte long, tableau) ne peut élargir la page ; contrairement à
          overflow-hidden, il ne crée pas de zone de défilement et laisse l'en-tête collant fonctionner. */}
      <div className="min-h-dvh overflow-x-clip lg:pl-[260px]">
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
          <div className={cx("mx-auto flex h-16 items-center justify-between gap-3", frame)}>
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
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-10px font-bold text-white ring-2 ring-canvas">
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

        <main className={cx("mx-auto w-full min-w-0 animate-fade-in pt-4 lg:pt-5 lg:pb-12", floatingNav ? "pb-32" : "pb-28", frame)}>
          <InstallHint />
          {children}
        </main>
      </div>
      {/* Hors du conteneur rogné : Safari iOS peut masquer un élément fixe placé dans un parent en overflow: clip. */}
      <BottomNav items={items} root={root} floating={floatingNav} />
      <Toaster />
    </>
  );
}
