import Link from "next/link";
import { Smile } from "lucide-react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { getCurriculum } from "@/server/queries/curriculum";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { SearchBar } from "@/components/admin/search-bar";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/pagination";

export const metadata = { title: "Élèves" };

export default async function AdminChildrenPage({ searchParams }: { searchParams: Promise<{ q?: string; classe?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const { q, classe, page } = await searchParams;
  const term = q?.trim().slice(0, 80);
  const curriculum = await getCurriculum();
  const where = {
      ...(classe ? { currentClass: classe } : {}),
      ...(term
        ? { OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }, { currentSchool: { contains: term, mode: "insensitive" } }] }
        : {}),
  } satisfies Prisma.ChildWhereInput;
  const info = paginate(await db.child.count({ where }), page);
  const children = await db.child.findMany({
    where,
    include: { parent: true, _count: { select: { tutorings: { where: { status: "ACTIVE" } } } } },
    orderBy: { createdAt: "desc" },
    skip: info.skip,
    take: info.take,
  });
  return (
    <>
      <PageHeader title="Élèves" subtitle={`${info.total} élève${info.total > 1 ? "s" : ""}`} />
      <SearchBar q={q} placeholder="Nom, école">
        <select name="classe" defaultValue={classe ?? ""} className="field w-auto min-w-40" aria-label="Classe">
          <option value="">Toutes les classes</option>
          {curriculum.classes.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
      </SearchBar>
      {children.length === 0 ? (
        <EmptyState icon={Smile} title="Aucun élève" />
      ) : (
        <Table head={["Élève", "Classe", "École", "Parent", "Accompagnements en cours", "Inscrit le"]}>
          {children.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/admin/eleves/${c.id}`} className="font-medium text-brand-700 hover:text-brand-800">
                  {fullName(c)}
                </Link>
              </Td>
              <Td>{c.currentClass}</Td>
              <Td>{c.currentSchool ?? "-"}</Td>
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
      <Pagination info={info} path="/admin/eleves" params={{ q, classe }} label="élève" />
    </>
  );
}
