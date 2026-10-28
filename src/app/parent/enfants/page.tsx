import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { fullName } from "@/lib/format";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";

export const metadata = { title: "Mes enfants" };

export default async function ChildrenPage() {
  const user = await requireRole("PARENT");
  const children = await db.child.findMany({
    where: { parentId: user.id },
    include: { tutorings: { where: { status: "ACTIVE" }, select: { id: true } } },
    orderBy: { firstName: "asc" },
  });
  return (
    <>
      <PageHeader title="Mes enfants" action={<LinkButton href="/parent/enfants/nouveau">+ Inscrire un enfant</LinkButton>} />
      {children.length === 0 ? (
        <EmptyState title="Aucun enfant inscrit." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={`/parent/enfants/${c.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
                <p className="font-semibold">{fullName(c)}</p>
                <p className="text-sm text-slate-600">
                  {c.currentClass}
                  {c.currentSchool ? ` · ${c.currentSchool}` : ""}
                </p>
                <p className="mt-2 text-xs text-slate-500">{c.tutorings.length} tutorat(s) en cours</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
