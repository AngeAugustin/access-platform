import Link from "next/link";
import { UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { PROFILE_STATUS } from "@/lib/constants";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState, PageHeader, Tabs, Table, Td, cx } from "@/components/ui";
import { AccountBadge, ProfileBadge } from "@/components/status";
import { SearchBar, userSearch } from "@/components/admin/search-bar";
import { Avatar } from "@/components/avatar";
import { tutorReliability } from "@/server/queries/follow-ups";

export const metadata = { title: "Tuteurs" };

export default async function AdminTutorsPage({ searchParams }: { searchParams: Promise<{ q?: string; onglet?: string }> }) {
  await requireRole("ADMIN");
  const { q, onglet } = await searchParams;
  const tab = onglet === "valides" ? "valides" : onglet === "tous" ? "tous" : "a-verifier";
  const statusFilter = tab === "valides" ? { status: "VALIDATED" as const } : tab === "a-verifier" ? { status: "SUBMITTED" as const } : {};
  const [tutors, toCheck, validated, all] = await Promise.all([
    db.tutorProfile.findMany({
      where: { ...statusFilter, user: userSearch(q) },
      include: { user: true, documents: { where: { type: "PHOTO" }, select: { id: true } }, _count: { select: { followUps: { where: { status: "ACTIVE" } } } } },
      orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    db.tutorProfile.count({ where: { status: "SUBMITTED" } }),
    db.tutorProfile.count({ where: { status: "VALIDATED" } }),
    db.tutorProfile.count(),
  ]);
  const reliability = await tutorReliability(tutors.map((t) => t.id));
  const qs = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <>
      <PageHeader title="Tuteurs" subtitle="Ils assurent le suivi quotidien des enfants pour les parents. Un éducateur peut aussi être tuteur." />
      <Tabs
        label="Tuteurs"
        current={tab}
        items={[
          { key: "a-verifier", href: `/admin/tuteurs?onglet=a-verifier${qs}`, label: "À vérifier", count: toCheck },
          { key: "valides", href: `/admin/tuteurs?onglet=valides${qs}`, label: "Validés", count: validated },
          { key: "tous", href: `/admin/tuteurs?onglet=tous${qs}`, label: "Tous", count: all },
        ]}
      />
      <SearchBar q={q} placeholder="Nom, e-mail, téléphone, NPI">
        <input type="hidden" name="onglet" value={tab} />
      </SearchBar>
      {tutors.length === 0 ? (
        <EmptyState icon={UserCheck} title={tab === "a-verifier" ? "Aucun dossier à vérifier" : "Aucun tuteur"} />
      ) : (
        <Table head={["Tuteur", "Zone", "Dossier", "Suivis actifs", "Faites à temps (30 j)", "Manquées (30 j)", "Transmis le", "Compte"]}>
          {tutors.map((t) => {
            const r = reliability.get(t.id);
            return (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/admin/tuteurs/${t.id}`} className="flex items-center gap-3">
                    <Avatar documentId={t.documents[0]?.id} name={fullName(t.user)} size={34} />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium text-ink hover:text-brand-700">
                        {fullName(t.user)}
                        {t.user.role === "EDUCATOR" && <span className="rounded bg-slate-100 px-1.5 text-xs font-normal text-slate-500">aussi éducateur</span>}
                      </span>
                      <span className="block text-xs text-slate-500">{t.user.email}</span>
                    </span>
                  </Link>
                </Td>
                <Td className="max-w-56 truncate">{t.zone ?? "-"}</Td>
                <Td>
                  <ProfileBadge status={t.status} />
                </Td>
                <Td>{t._count.followUps}</Td>
                <Td>
                  {r?.rate == null ? (
                    <span className="text-slate-400">-</span>
                  ) : (
                    <span className={cx("font-medium", r.rate >= 90 ? "text-emerald-700" : r.rate >= 75 ? "text-amber-600" : "text-rose-600")}>{r.rate} %</span>
                  )}
                </Td>
                <Td>{r?.missed ?? 0}</Td>
                <Td className="whitespace-nowrap">{formatDate(t.submittedAt)}</Td>
                <Td>
                  <AccountBadge status={t.user.status} lockedUntil={t.user.lockedUntil} />
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      <p className="mt-3 text-xs text-slate-500">{Object.keys(PROFILE_STATUS).length > 0 && "Un dossier refusé repasse « à compléter » dès que le tuteur le corrige."}</p>
    </>
  );
}
