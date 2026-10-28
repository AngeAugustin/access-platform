import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/parent", label: "Accueil", icon: "🏠", mobile: true },
  { href: "/parent/enfants", label: "Enfants", icon: "🧒", mobile: true },
  { href: "/parent/educateurs", label: "Éducateurs", icon: "🎓", mobile: true },
  { href: "/parent/tutorats", label: "Suivis", icon: "📘", mobile: true },
  { href: "/parent/paiements", label: "Paiements", icon: "💳", mobile: true },
  { href: "/parent/reclamations", label: "Réclamations", icon: "✉️" },
  { href: "/parent/notifications", label: "Notifications", icon: "🔔" },
  { href: "/parent/profil", label: "Profil", icon: "👤" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PARENT");
  return (
    <AppShell user={user} items={items} root="/parent">
      {children}
    </AppShell>
  );
}
