import "@fontsource-variable/bricolage-grotesque";
import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/parent", label: "Accueil", icon: "home", mobile: true },
  { href: "/parent/enfants", label: "Mes enfants", mobileLabel: "Enfants", icon: "children", mobile: true },
  // Catalogue : éducateurs et tuteurs. Hors de la barre mobile (5 onglets au plus), on y accède depuis l'accueil.
  { href: "/parent/educateurs", label: "Trouver un intervenant", icon: "search" },
  { href: "/parent/tutorats", label: "Cours", icon: "tutorings", mobile: true },
  { href: "/parent/suivi", label: "Suivi", icon: "followups", mobile: true },
  { href: "/parent/paiements", label: "Paiements", icon: "payments", mobile: true },
  { href: "/parent/reclamations", label: "Réclamations", icon: "complaints", section: "Assistance" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PARENT");
  return (
    <AppShell user={user} items={items} root="/parent" floatingNav>
      {children}
    </AppShell>
  );
}
