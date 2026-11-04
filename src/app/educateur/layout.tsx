import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav-links";

const items: NavItem[] = [
  { href: "/educateur", label: "Accueil", icon: "home", mobile: true },
  { href: "/educateur/eleves", label: "Mes élèves", mobileLabel: "Élèves", icon: "children", mobile: true },
  { href: "/educateur/seances", label: "Séances", icon: "lessons", mobile: true },
  { href: "/educateur/paiements", label: "Revenus", icon: "wallet", mobile: true },
  { href: "/educateur/dossier", label: "Mon dossier", mobileLabel: "Dossier", icon: "dossier", mobile: true },
  { href: "/educateur/reclamations", label: "Réclamations", icon: "complaints", section: "Assistance" },
];

export default async function EducatorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("EDUCATOR");
  // Un éducateur peut aussi être tuteur : lien vers son espace tuteur, ou vers son activation.
  const tutor = await db.tutorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  return (
    <AppShell user={user} items={items} root="/educateur" switchTo={{ href: "/tuteur", label: tutor ? "Espace tuteur" : "Devenir tuteur" }}>
      {children}
    </AppShell>
  );
}
