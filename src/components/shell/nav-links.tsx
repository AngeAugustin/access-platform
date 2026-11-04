"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  BookOpenCheck,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  FileClock,
  FolderOpen,
  GraduationCap,
  House,
  LayoutDashboard,
  Library,
  ListChecks,
  Search,
  MessageSquareWarning,
  NotebookPen,
  Settings2,
  ShieldCheck,
  Smile,
  UserCheck,
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
  curriculum: Library,
  search: Search,
  today: CalendarCheck,
  followups: ListChecks,
  tutors: UserCheck,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof icons;
export type NavItem = { href: string; label: string; icon: NavIcon; mobile?: boolean; mobileLabel?: string; section?: string };

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

// Sections pliées de la barre latérale, mémorisées dans le navigateur (vide côté serveur).
const COLLAPSED_KEY = "access:nav-collapsed";
const collapsedListeners = new Set<() => void>();

function readCollapsedRaw() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseCollapsed(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeCollapsed(sections: string[]) {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(sections));
  } catch {}
  collapsedListeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    collapsedListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const sections = [...new Set(items.map((i) => i.section ?? ""))];
  const collapsed = parseCollapsed(useSyncExternalStore(subscribeCollapsed, readCollapsedRaw, () => "[]"));

  // La section de la page courante reste dépliée tant qu'on ne la replie pas soi-même.
  const activeSection = items.find((i) => isActive(pathname, i.href, root))?.section;
  const [trackedSection, setTrackedSection] = useState(activeSection);
  const [forcedOpen, setForcedOpen] = useState(activeSection);
  if (activeSection !== trackedSection) {
    setTrackedSection(activeSection);
    setForcedOpen(activeSection);
  }

  function toggle(section: string, open: boolean) {
    if (open) {
      if (forcedOpen === section) setForcedOpen(undefined);
      writeCollapsed([...collapsed.filter((s) => s !== section), section]);
    } else {
      writeCollapsed(collapsed.filter((s) => s !== section));
    }
  }

  return (
    <nav className="space-y-6" aria-label="Navigation principale">
      {sections.map((section) => {
        const open = !section || section === forcedOpen || !collapsed.includes(section);
        const listId = `nav-section-${section || "principale"}`;
        return (
          <div key={section}>
            {section && (
              <button
                type="button"
                onClick={() => toggle(section, open)}
                aria-expanded={open}
                aria-controls={listId}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-1 text-11px font-semibold tracking-wider text-slate-400 uppercase transition hover:text-slate-600"
              >
                {section}
                <ChevronDown className={cx("size-3.5 transition-transform", !open && "-rotate-90")} strokeWidth={2.2} aria-hidden />
              </button>
            )}
            <ul id={listId} hidden={!open} className="space-y-0.5">
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
        );
      })}
    </nav>
  );
}

const columns: Record<number, string> = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };

// `floating` : barre bleue détachée du bord, en pilule (espace parent).
export function BottomNav({ items, root, floating = false }: { items: NavItem[]; root: string; floating?: boolean }) {
  const pathname = usePathname();
  const mobileItems = items.filter((i) => i.mobile);
  if (floating) {
    return (
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 lg:hidden" aria-label="Navigation mobile">
        <ul className={cx("mx-auto grid max-w-md gap-1 rounded-[26px] bg-brand-600 p-1.5 shadow-[0_18px_40px_-16px_rgb(0_74_173/0.6)]", columns[mobileItems.length] ?? "grid-cols-5")}>
          {mobileItems.map((item) => {
            const Icon = icons[item.icon];
            const active = isActive(pathname, item.href, root);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-[20px] text-11px font-semibold transition",
                    active ? "bg-white/15 text-white" : "text-brand-200 hover:text-white",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.1 : 1.9} aria-hidden />
                  {item.mobileLabel ?? item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Navigation mobile"
    >
      <ul className={cx("mx-auto grid max-w-md", columns[mobileItems.length] ?? "grid-cols-5")}>
        {mobileItems.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(pathname, item.href, root);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex flex-col items-center gap-1 pt-2 pb-2.5 text-11px font-medium transition", active ? "text-brand-700" : "text-slate-500")}
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
