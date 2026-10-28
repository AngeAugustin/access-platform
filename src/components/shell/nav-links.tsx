"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; icon: string; mobile?: boolean };

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Navigation principale">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href, root) ? "page" : undefined}
          className={cx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
            isActive(pathname, item.href, root) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100",
          )}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const mobileItems = items.filter((i) => i.mobile);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
      aria-label="Navigation mobile"
    >
      {mobileItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href, root) ? "page" : undefined}
          className={cx(
            "flex flex-col items-center gap-0.5 py-2 text-[11px]",
            isActive(pathname, item.href, root) ? "text-brand-700" : "text-slate-500",
          )}
        >
          <span aria-hidden className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
