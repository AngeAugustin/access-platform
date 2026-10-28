import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  const items: NavItem[] = [
    { href: "/admin", label: "Tableau de bord", mobileLabel: "Accueil", icon: "dashboard", mobile: true },
    { href: "/admin/educateurs", label: "Éducateurs", icon: "educators", mobile: true, section: "Communauté" },
    { href: "/admin/parents", label: "Parents", icon: "parents", section: "Communauté" },
    { href: "/admin/eleves", label: "Élèves", icon: "children", section: "Communauté" },
    { href: "/admin/tutorats", label: "Tutorats", icon: "tutorings", mobile: true, section: "Activité" },
    { href: "/admin/paiements", label: "Paiements", icon: "payments", mobile: true, section: "Activité" },
    { href: "/admin/reclamations", label: "Réclamations", icon: "complaints", mobile: true, section: "Activité" },
    { href: "/admin/tarifs", label: "Tarifs et paramètres", icon: "settings", section: "Configuration" },
    ...(user.isSuperAdmin ? [{ href: "/admin/administrateurs", label: "Administrateurs", icon: "admins" as const, section: "Configuration" }] : []),
    { href: "/admin/journal", label: "Journal d'audit", icon: "journal", section: "Configuration" },
  ];
  return (
    <AppShell user={user} items={items} root="/admin">
      {children}
    </AppShell>
  );
}
