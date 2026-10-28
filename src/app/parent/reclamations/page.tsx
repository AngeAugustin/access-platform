import { requireRole } from "@/lib/auth/dal";
import { ComplaintsPage } from "@/components/shell/complaints-page";

export const metadata = { title: "Réclamations" };

export default async function Page() {
  return <ComplaintsPage user={await requireRole("PARENT")} />;
}
