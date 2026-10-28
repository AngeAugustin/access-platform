import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/parent", label: "Accueil", icon: "home", mobile: true },
  { href: "/parent/enfants", label: "Mes enfants", mobileLabel: "Enfants", icon: "children", mobile: true },
  { href: "/parent/educateurs", label: "Trouver un éducateur", mobileLabel: "Éducateurs", icon: "educators", mobile: true },
  { href: "/parent/tutorats", label: "Suivis", icon: "tutorings", mobile: true },
  { href: "/parent/paiements", label: "Paiements", icon: "payments", mobile: true },
  { href: "/parent/reclamations", label: "Réclamations", icon: "complaints", section: "Assistance" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PARENT");
  return (
    <AppShell user={user} items={items} root="/parent">
      {children}
    </AppShell>
  );
}
