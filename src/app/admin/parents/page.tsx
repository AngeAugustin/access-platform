import Link from "next/link";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Table, Td } from "@/components/ui";
import { AccountBadge } from "@/components/status";
import { SearchBar, userSearch } from "@/components/admin/search-bar";
import { Avatar } from "@/components/avatar";
import { Pagination } from "@/components/ui/pagination";
import { paginate } from "@/lib/pagination";

export const metadata = { title: "Parents" };

export default async function AdminParentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const { q, page } = await searchParams;
  const where = { role: "PARENT" as const, ...userSearch(q) };
  const info = paginate(await db.user.count({ where }), page);
  const parents = await db.user.findMany({
    where,
    include: { _count: { select: { children: true, parentTutorings: true } } },
    orderBy: { createdAt: "desc" },
    skip: info.skip,
    take: info.take,
  });
  return (
    <>
      <PageHeader title="Parents" subtitle={`${info.total} famille${info.total > 1 ? "s" : ""}`} />
      <SearchBar q={q} placeholder="Nom, e-mail, téléphone, NPI" />
      {parents.length === 0 ? (
        <EmptyState icon={Users} title="Aucun parent" />
      ) : (
        <Table head={["Nom", "Contact", "Ville", "Enfants", "Tutorats", "Inscrit le", "Compte"]}>
          {parents.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/parents/${p.id}`} className="flex items-center gap-3 font-medium text-ink hover:text-brand-700">
                  <Avatar name={fullName(p)} size={34} />
                  {fullName(p)}
                </Link>
              </Td>
              <Td>
                {p.email}
                <span className="block text-xs text-slate-500">{p.phone}</span>
              </Td>
              <Td>{p.city ?? "—"}</Td>
              <Td>{p._count.children}</Td>
              <Td>{p._count.parentTutorings}</Td>
              <Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td>
              <Td>
                <AccountBadge status={p.status} lockedUntil={p.lockedUntil} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination info={info} path="/admin/parents" params={{ q }} label="famille" />
    </>
  );
}
