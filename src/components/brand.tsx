import Image from "next/image";
import Link from "next/link";
import { cx } from "@/components/ui";
import icon from "@/assets/brand/icon.png";
import logo from "@/assets/brand/logo.png";
import logoLight from "@/assets/brand/logo-light.png";

// Icône Access Tutorat seule (élève et étoile).
export function LogoMark({ className }: { className?: string }) {
  return <Image src={icon} alt="" width={59} height={64} className={cx("size-8 object-contain", className)} />;
}

// Logo complet ; la variante claire (personnage et texte en blanc) se pose sur fond sombre.
export function Logo({ href = "/", tone = "dark", className }: { href?: string; tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href={href} className={cx("inline-flex items-center", className)} aria-label="Access Tutorat, accueil">
      <Image src={tone === "light" ? logoLight : logo} alt="" width={110} height={48} preload className="h-12 w-auto" />
    </Link>
  );
}
