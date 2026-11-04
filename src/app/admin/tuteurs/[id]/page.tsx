import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Cake, CalendarDays, Check, FileText, House, IdCard, ImageIcon, ListChecks, Mail, MapPin, Phone, Send, Shield, Wallet, X, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, FOLLOW_UP_STATUS, PROFILE_STATUS, TUTOR_REQUIRED_DOCUMENTS } from "@/lib/constants";
import { age, formatDate, formatFcfa, fullName, payoutAccount } from "@/lib/format";
import { Badge, Card, cx } from "@/components/ui";
import { AccountBadge } from "@/components/status";
import { isLocked } from "@/lib/auth/lockout";
import { AccountManagement } from "@/components/admin/forms";
import { TutorDecisionForms } from "@/components/admin/tutor-forms";
import { BackLink, ContactActions, DetailHeader, Empty, Info, MetaItem, Metric } from "@/components/admin/detail";
import { Avatar } from "@/components/avatar";
import { tutorReliability } from "@/server/queries/follow-ups";

export const metadata = { title: "Dossier tuteur" };

const documentIcons: Record<(typeof TUTOR_REQUIRED_DOCUMENTS)[number], LucideIcon> = { ID_CARD: IdCard, CRIMINAL_RECORD: FileText, PHOTO: ImageIcon };
const statusTones = { INCOMPLETE: "gray", SUBMITTED: "amber", VALIDATED: "green", REJECTED: "red" } as const;
const followUpTones = { REQUESTED: "amber", ACTIVE: "green", DECLINED: "red", CANCELLED: "gray", ENDED: "gray" } as const;

export default async function AdminTutorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const t = await db.tutorProfile.findUnique({
    where: { id },
    include: {
      user: { include: { educatorProfile: { select: { id: true } } } },
      documents: true,
      validatedBy: { select: { firstName: true, lastName: true } },
      followUps: { include: { parent: true, children: { include: { child: { select: { firstName: true } } } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!t) notFound();
  const reliability = (await tutorReliability([t.id])).get(t.id);
  const name = fullName(t.user);
  const photo = t.documents.find((d) => d.type === "PHOTO");
  const active = t.followUps.filter((f) => f.status === "ACTIVE");
  const missingDocuments = TUTOR_REQUIRED_DOCUMENTS.filter((type) => !t.documents.some((d) => d.type === type));
  const checks = [
    { ok: Boolean(t.birthDate && t.zone && t.occupation), label: "Profil complet" },
    { ok: Boolean(t.guarantorName && t.guarantorPhone), label: t.guarantorName ? "Garant renseigné" : "Garant manquant" },
    { ok: Boolean(t.payoutPhone), label: t.payoutPhone ? "Numéro Mobile Money renseigné" : "Numéro Mobile Money manquant" },
    ...(missingDocuments.length ? missingDocuments.map((type) => ({ ok: false, label: `${DOCUMENT_TYPES[type]} manquant${type === "PHOTO" ? "e" : ""}` })) : [{ ok: true, label: "Pièces obligatoires fournies" }]),
  ];

  return (
    <>
      <BackLink href="/admin/tuteurs">Tuteurs</BackLink>
      <DetailHeader
        avatar={<Avatar name={name} documentId={photo?.id} size={72} />}
        title={name}
        badges={
          <>
            <Badge tone={statusTones[t.status]}>{PROFILE_STATUS[t.status]}</Badge>
            {t.user.educatorProfile && (
              <Link href={`/admin/educateurs/${t.user.educatorProfile.id}`} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                Aussi éducateur
              </Link>
            )}
            {(t.user.status !== "ACTIVE" || isLocked(t.user.lockedUntil)) && <AccountBadge status={t.user.status} lockedUntil={t.user.lockedUntil} />}
          </>
        }
        meta={
          <>
            {t.zone && <MetaItem icon={MapPin}>{t.zone}</MetaItem>}
            {t.occupation && <MetaItem icon={Briefcase}>{t.occupation}</MetaItem>}
            <MetaItem icon={CalendarDays}>Inscrit le {formatDate(t.user.createdAt)}</MetaItem>
            {t.submittedAt && <MetaItem icon={Send}>Transmis le {formatDate(t.submittedAt)}</MetaItem>}
          </>
        }
        actions={<ContactActions phone={t.user.phone} email={t.user.email} />}
        metrics={
          <>
            <Metric label="Pièces obligatoires" tone={missingDocuments.length ? "amber" : "green"}>
              {TUTOR_REQUIRED_DOCUMENTS.length - missingDocuments.length} / {TUTOR_REQUIRED_DOCUMENTS.length}
            </Metric>
            <Metric label="Suivis actifs">{active.length}</Metric>
            <Metric label="Faites à temps (30 j)" tone={reliability?.rate == null ? undefined : reliability.rate >= 90 ? "green" : reliability.rate >= 75 ? "amber" : "red"}>
              {reliability?.rate == null ? <span className="text-slate-400">-</span> : `${reliability.rate} %`}
            </Metric>
            <Metric label="Manquées (30 j)" tone={reliability?.missed ? "red" : undefined}>
              {reliability?.missed ?? 0}
            </Metric>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card title="Présentation">
            <p className="text-sm leading-relaxed whitespace-pre-line text-slate-600">{t.bio || "Aucune présentation."}</p>
          </Card>
          <Card title="Pièces justificatives">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TUTOR_REQUIRED_DOCUMENTS.map((type) => {
                const doc = t.documents.find((d) => d.type === type);
                const Icon = documentIcons[type];
                return (
                  <li key={type} className={cx("flex items-center gap-3 rounded-xl border p-3", doc ? "border-slate-200/80" : "border-dashed border-rose-200 bg-rose-50/40")}>
                    <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-lg", doc ? "bg-slate-100 text-slate-600" : "bg-rose-100 text-rose-600")} aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{DOCUMENT_TYPES[type]}</p>
                      {doc ? (
                        <a href={`/api/fichiers/${doc.id}`} target="_blank" rel="noopener" className="block truncate text-xs text-brand-700 hover:text-brand-800">
                          {doc.originalName}
                        </a>
                      ) : (
                        <p className="text-xs text-rose-600">Manquant</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Suivis">
            {t.followUps.length === 0 ? (
              <Empty icon={ListChecks} title="Aucun suivi">
                Les demandes des familles apparaîtront ici.
              </Empty>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {t.followUps.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={fullName(f.parent)} size={36} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/parents/${f.parentId}`} className="text-sm font-medium text-ink hover:text-brand-700">
                        Famille {f.parent.lastName}
                      </Link>
                      <p className="text-13px text-slate-500">
                        {f.children.map((c) => c.child.firstName).join(", ")} · {formatFcfa(f.monthlyPrice)} / mois · {f.reference}
                      </p>
                    </div>
                    <Badge tone={followUpTones[f.status]}>{FOLLOW_UP_STATUS[f.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title="Décision">
            <ul className="mb-4 space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.ok ? <Check className="size-4 text-emerald-600" aria-hidden /> : <X className="size-4 text-rose-500" aria-hidden />}
                  <span className={c.ok ? "text-ink" : "text-rose-700"}>{c.label}</span>
                </li>
              ))}
            </ul>
            {t.status === "VALIDATED" ? (
              <p className="mb-3 text-sm text-slate-600">
                Validé le {formatDate(t.validatedAt)}
                {t.validatedBy && ` par ${fullName(t.validatedBy)}`}.
              </p>
            ) : t.status === "INCOMPLETE" ? (
              <p className="text-sm text-slate-500">Le tuteur n&apos;a pas encore transmis son dossier.</p>
            ) : null}
            {t.status !== "INCOMPLETE" && <TutorDecisionForms tutorId={t.id} canValidate={t.status !== "VALIDATED"} />}
          </Card>
          <Card title="Coordonnées">
            <dl className="space-y-3 text-sm">
              <Info icon={Cake} label="Âge" value={t.birthDate ? `${age(t.birthDate)} ans` : "-"} />
              <Info icon={Mail} label="E-mail" value={t.user.email} />
              <Info icon={Phone} label="Téléphone" value={t.user.phone} />
              <Info icon={House} label="Adresse" value={[t.user.address, t.user.city].filter(Boolean).join(", ") || "-"} />
              <Info icon={Shield} label="Garant" value={t.guarantorName ? `${t.guarantorName} · ${t.guarantorPhone ?? ""}` : "-"} />
              <Info icon={Wallet} label="Mobile Money" value={payoutAccount(t) ?? "-"} />
            </dl>
          </Card>
          <Card title="Compte">
            <AccountManagement userId={t.userId} status={t.user.status} lockedUntil={t.user.lockedUntil} />
          </Card>
        </aside>
      </div>
    </>
  );
}
