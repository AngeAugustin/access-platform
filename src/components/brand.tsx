import Link from "next/link";
import { cx } from "@/components/ui";

// Logo Access : un « A » stylisé dans une pastille, suivi du nom.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <path d="M9.5 23 16 8.5 22.5 23" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.2 18h7.6" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24.5" cy="9" r="2.6" className="fill-amber-400" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "dark", className }: { href?: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href={href} className={cx("inline-flex items-center gap-2.5", className)} aria-label="Access, accueil">
      <LogoMark />
      <span className={cx("text-[17px] font-semibold tracking-tight", tone === "light" ? "text-white" : "text-ink")}>Access</span>
    </Link>
  );
}
