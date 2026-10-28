import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  const items: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", icon: "📊", mobile: true },
    { href: "/admin/educateurs", label: "Éducateurs", icon: "🎓", mobile: true },
    { href: "/admin/parents", label: "Parents", icon: "👪" },
    { href: "/admin/eleves", label: "Élèves", icon: "🧒" },
    { href: "/admin/tutorats", label: "Tutorats", icon: "📘", mobile: true },
    { href: "/admin/paiements", label: "Paiements", icon: "💳", mobile: true },
    { href: "/admin/reclamations", label: "Réclamations", icon: "✉️", mobile: true },
    { href: "/admin/tarifs", label: "Tarifs et paramètres", icon: "⚙️" },
    ...(user.isSuperAdmin ? [{ href: "/admin/administrateurs", label: "Administrateurs", icon: "🛡️" }] : []),
    { href: "/admin/journal", label: "Journal", icon: "🧾" },
  ];
  return (
    <AppShell user={user} items={items} root="/admin">
      {children}
    </AppShell>
  );
}
