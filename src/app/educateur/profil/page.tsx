import { requireRole } from "@/lib/auth/dal";
import { ProfilePage } from "@/components/shell/profile-page";

export const metadata = { title: "Mon profil" };

export default async function Page() {
  return <ProfilePage user={await requireRole("EDUCATOR")} />;
}
