import Link from "next/link";
import { ChevronRight, Plus, Smile } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { fullName } from "@/lib/format";
import { EmptyState, LinkButton, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { ScreenTitle, panel, roundIcon } from "@/components/parent/kit";

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
      <ScreenTitle
        eyebrow="Leur fiche aide l'éducateur à préparer les séances"
        title="Mes enfants"
        action={
          children.length > 0 && (
            <Link href="/parent/enfants/nouveau" className={cx(roundIcon, "bg-white text-ink shadow-[0_0_0_1px_rgb(15_23_42/0.07)] hover:bg-slate-50")} aria-label="Inscrire un enfant">
              <Plus className="size-5" strokeWidth={1.9} aria-hidden />
            </Link>
          )
        }
      />
      {children.length === 0 ? (
        <EmptyState icon={Smile} title="Aucun enfant inscrit" action={<LinkButton href="/parent/enfants/nouveau">Inscrire mon enfant</LinkButton>}>
          Commencez par sa classe et son niveau dans chaque matière.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={`/parent/enfants/${c.id}`} className={cx(panel, "group flex items-center gap-3.5 p-4 transition hover:shadow-lift")}>
                <Avatar name={fullName(c)} size={52} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-ink">{fullName(c)}</span>
                  <span className="mt-0.5 block truncate text-13px text-slate-500">
                    {c.currentClass}
                    {c.currentSchool && ` · ${c.currentSchool}`}
                  </span>
                  <span
                    className={cx(
                      "mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      c.tutorings.length > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {c.tutorings.length > 0 ? `${c.tutorings.length} accompagnement${c.tutorings.length > 1 ? "s" : ""} en cours` : "Aucun suivi"}
                  </span>
                </span>
                <ChevronRight className="size-5 text-slate-300 transition group-hover:text-brand-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
