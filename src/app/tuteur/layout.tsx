import { requireTutorSpace } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/tuteur", label: "Aujourd'hui", icon: "today", mobile: true },
  { href: "/tuteur/familles", label: "Familles", icon: "parents", mobile: true },
  { href: "/tuteur/dossier", label: "Mon dossier", mobileLabel: "Dossier", icon: "dossier", mobile: true },
  { href: "/tuteur/reclamations", label: "Réclamations", icon: "complaints", section: "Assistance" },
];

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTutorSpace();
  return (
    <AppShell user={user} items={items} root="/tuteur" space="Tuteur" switchTo={user.role === "EDUCATOR" ? { href: "/educateur", label: "Espace éducateur" } : undefined}>
      {children}
    </AppShell>
  );
}
