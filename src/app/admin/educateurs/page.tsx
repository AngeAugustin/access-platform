import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PROFILE_STATUS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Stars, Table, Td } from "@/components/ui";
import { AccountBadge, ProfileBadge } from "@/components/status";
import { SearchBar, userSearch } from "@/components/admin/search-bar";
import { Avatar } from "@/components/avatar";
import { Pagination } from "@/components/ui/pagination";
import { pageSlice } from "@/lib/pagination";

export const metadata = { title: "Éducateurs" };

export default async function AdminEducatorsPage({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const { q, statut, page } = await searchParams;
  const status = statut && statut in PROFILE_STATUS ? (statut as keyof typeof PROFILE_STATUS) : undefined;
  // L'ordre voulu (transmis, refusés, incomplets, validés) n'est pas celui de l'énumération : on trie les
  // identifiants en mémoire, puis on ne charge le détail que de la page affichée.
  const all = await db.educatorProfile.findMany({
    where: { ...(status ? { status } : {}), user: userSearch(q) },
    select: { id: true, status: true },
    orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }],
  });
  const order = { SUBMITTED: 0, REJECTED: 1, INCOMPLETE: 2, VALIDATED: 3 };
  const { items: pageIds, info } = pageSlice(
    all.sort((a, b) => order[a.status] - order[b.status]).map((e) => e.id),
    page,
  );
  const rows = await db.educatorProfile.findMany({ where: { id: { in: pageIds } }, include: { user: true, _count: { select: { bookedSlots: true } } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const educators = pageIds.flatMap((id) => byId.get(id) ?? []);

  return (
    <>
      <PageHeader title="Éducateurs" subtitle="Les dossiers transmis apparaissent en tête de liste." />
      <SearchBar q={q} placeholder="Nom, e-mail, téléphone, NPI">
        <select name="statut" defaultValue={statut ?? ""} className="field w-auto min-w-48" aria-label="Statut">
          <option value="">Tous les statuts</option>
          {Object.entries(PROFILE_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </SearchBar>
      {educators.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aucun éducateur" />
      ) : (
        <Table head={["Nom", "Zone", "Dossier", "Note", "Créneaux pris", "Transmis le", "Compte"]}>
          {educators.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/educateurs/${e.id}`} className="flex items-center gap-3">
                  <Avatar name={fullName(e.user)} size={34} />
                  <span>
                    <span className="block font-medium text-ink hover:text-brand-700">{fullName(e.user)}</span>
                    <span className="block text-xs text-slate-500">{e.user.email}</span>
                  </span>
                </Link>
              </Td>
              <Td>{e.zone ?? "-"}</Td>
              <Td>
                <ProfileBadge status={e.status} />
              </Td>
              <Td>
                <Stars value={e.stars} />
              </Td>
              <Td>{e._count.bookedSlots}</Td>
              <Td className="whitespace-nowrap">{formatDate(e.submittedAt)}</Td>
              <Td>
                <AccountBadge status={e.user.status} lockedUntil={e.user.lockedUntil} />
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination info={info} path="/admin/educateurs" params={{ q, statut }} label="éducateur" />
    </>
  );
}
