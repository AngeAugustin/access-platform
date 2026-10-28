import Link from "next/link";
import { Smile } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { CLASS_LEVELS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { SearchBar } from "@/components/admin/search-bar";

export const metadata = { title: "Élèves" };

export default async function AdminChildrenPage({ searchParams }: { searchParams: Promise<{ q?: string; classe?: string }> }) {
  await requireRole("ADMIN");
  const { q, classe } = await searchParams;
  const term = q?.trim().slice(0, 80);
  const children = await db.child.findMany({
    where: {
      ...(classe ? { currentClass: classe } : {}),
      ...(term
        ? { OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }, { currentSchool: { contains: term, mode: "insensitive" } }] }
        : {}),
    },
    include: { parent: true, _count: { select: { tutorings: { where: { status: "ACTIVE" } } } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title="Élèves" subtitle={`${children.length} résultat(s)`} />
      <SearchBar q={q} placeholder="Nom, école">
        <select name="classe" defaultValue={classe ?? ""} className="field w-auto min-w-40" aria-label="Classe">
          <option value="">Toutes les classes</option>
          {CLASS_LEVELS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </SearchBar>
      {children.length === 0 ? (
        <EmptyState icon={Smile} title="Aucun élève" />
      ) : (
        <Table head={["Élève", "Classe", "École", "Parent", "Tutorats en cours", "Inscrit le"]}>
          {children.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{fullName(c)}</Td>
              <Td>{c.currentClass}</Td>
              <Td>{c.currentSchool ?? "—"}</Td>
              <Td>
                <Link href={`/admin/parents/${c.parentId}`} className="font-medium text-brand-700 hover:text-brand-800">
                  {fullName(c.parent)}
                </Link>
              </Td>
              <Td>{c._count.tutorings}</Td>
              <Td className="whitespace-nowrap">{formatDate(c.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
