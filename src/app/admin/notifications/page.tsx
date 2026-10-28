import { requireRole } from "@/lib/auth/dal";
import { NotificationsPage } from "@/components/shell/notifications-page";

export const metadata = { title: "Notifications" };

export default async function Page() {
  return <NotificationsPage user={await requireRole("ADMIN")} />;
}
