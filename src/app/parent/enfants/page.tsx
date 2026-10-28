import Link from "next/link";
import { ChevronRight, Plus, School, Smile } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { fullName } from "@/lib/format";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/avatar";

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
      <PageHeader
        title="Mes enfants"
        subtitle="Leur fiche scolaire aide l'éducateur à préparer les séances."
        action={
          <LinkButton href="/parent/enfants/nouveau">
            <Plus aria-hidden /> Inscrire un enfant
          </LinkButton>
        }
      />
      {children.length === 0 ? (
        <EmptyState icon={Smile} title="Aucun enfant inscrit" action={<LinkButton href="/parent/enfants/nouveau">Inscrire mon enfant</LinkButton>}>
          Commencez par sa classe et son niveau dans chaque matière.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={`/parent/enfants/${c.id}`} className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-lift">
                <div className="flex items-center gap-3">
                  <Avatar name={fullName(c)} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{fullName(c)}</p>
                    <p className="text-sm text-slate-500">{c.currentClass}</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-[13px]">
                  <span className="flex min-w-0 items-center gap-1.5 text-slate-500">
                    <School className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{c.currentSchool ?? "École non précisée"}</span>
                  </span>
                  {c.tutorings.length > 0 ? <Badge tone="green">{c.tutorings.length} en cours</Badge> : <Badge>Aucun suivi</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
