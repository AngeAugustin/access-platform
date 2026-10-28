"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CreditCard,
  FileClock,
  FolderOpen,
  GraduationCap,
  House,
  LayoutDashboard,
  MessageSquareWarning,
  NotebookPen,
  Settings2,
  ShieldCheck,
  Smile,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/components/ui";

// Les icônes sont désignées par un nom : un composant ne peut pas passer du serveur au client.
const icons = {
  home: House,
  dashboard: LayoutDashboard,
  children: Smile,
  educators: GraduationCap,
  tutorings: BookOpenCheck,
  payments: CreditCard,
  wallet: Wallet,
  complaints: MessageSquareWarning,
  lessons: NotebookPen,
  dossier: FolderOpen,
  parents: Users,
  settings: Settings2,
  admins: ShieldCheck,
  journal: FileClock,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof icons;
export type NavItem = { href: string; label: string; icon: NavIcon; mobile?: boolean; mobileLabel?: string; section?: string };

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const sections = [...new Set(items.map((i) => i.section ?? ""))];
  return (
    <nav className="space-y-6" aria-label="Navigation principale">
      {sections.map((section) => (
        <div key={section}>
          {section && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{section}</p>}
          <ul className="space-y-0.5">
            {items
              .filter((i) => (i.section ?? "") === section)
              .map((item) => {
                const Icon = icons[item.icon];
                const active = isActive(pathname, item.href, root);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                      )}
                    >
                      <Icon className={cx("size-[18px]", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} strokeWidth={1.9} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function BottomNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const mobileItems = items.filter((i) => i.mobile);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Navigation mobile"
    >
      <ul className="mx-auto grid grid-cols-1 max-w-md" style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}>
        {mobileItems.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(pathname, item.href, root);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] font-medium transition", active ? "text-brand-700" : "text-slate-500")}
              >
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-brand-50")}>
                  <Icon className="size-5" strokeWidth={active ? 2.1 : 1.8} aria-hidden />
                </span>
                {item.mobileLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
