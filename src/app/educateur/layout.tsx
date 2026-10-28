import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/educateur", label: "Accueil", icon: "🏠", mobile: true },
  { href: "/educateur/eleves", label: "Élèves", icon: "🧒", mobile: true },
  { href: "/educateur/seances", label: "Séances", icon: "📝", mobile: true },
  { href: "/educateur/paiements", label: "Paiements", icon: "💰", mobile: true },
  { href: "/educateur/dossier", label: "Dossier", icon: "📁", mobile: true },
  { href: "/educateur/reclamations", label: "Réclamations", icon: "✉️" },
  { href: "/educateur/notifications", label: "Notifications", icon: "🔔" },
  { href: "/educateur/profil", label: "Profil", icon: "👤" },
];

export default async function EducatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("EDUCATOR");
  return (
    <AppShell user={user} items={items} root="/educateur">
      {children}
    </AppShell>
  );
}
