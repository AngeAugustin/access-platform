import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Award,
  BookOpenCheck,
  Briefcase,
  Cake,
  CalendarDays,
  Check,
  FileText,
  FileX,
  GraduationCap,
  Heart,
  House,
  IdCard,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  Send,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, PROFILE_STATUS, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { subjectLabel } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";
import { age, formatDate, formatDateTime, fullName, payoutAccount } from "@/lib/format";
import { Badge, Card, Stars, cx } from "@/components/ui";
import { AccountBadge, accountSummary } from "@/components/status";
import { isLocked } from "@/lib/auth/lockout";
import { AccountManagement, EducatorDecisionForms } from "@/components/admin/forms";
import { BackLink, ContactActions, DetailHeader, Empty, Info, MetaItem, Metric, TutoringRow } from "@/components/admin/detail";
import { Avatar } from "@/components/avatar";
import { AvailabilityGrid } from "@/components/availability-grid";
import { BackgroundSummary } from "@/components/educator/background-summary";

export const metadata = { title: "Dossier éducateur" };

type DocumentType = keyof typeof DOCUMENT_TYPES;

const documentIcons: Record<DocumentType, LucideIcon> = {
  ID_CARD: IdCard,
  CRIMINAL_RECORD: FileText,
  ACADEMIC_DIPLOMA: GraduationCap,
  PROFESSIONAL_DIPLOMA: Award,
  PHOTO: ImageIcon,
};

const statusTones = { INCOMPLETE: "gray", SUBMITTED: "amber", VALIDATED: "green", REJECTED: "red" } as const;

function fileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

function fileFormat(mimeType: string) {
  return (mimeType.split("/")[1] ?? "fichier").replace("jpeg", "jpg").toUpperCase();
}

export default async function AdminEducatorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;
  const e = await db.educatorProfile.findUnique({
    where: { id },
    include: {
      user: true,
      documents: true,
      availabilities: true,
      bookedSlots: true,
      validatedBy: { select: { firstName: true, lastName: true } },
      tutorings: { include: { child: true }, orderBy: { startDate: "desc" }, take: 20 },
      reviews: { orderBy: { createdAt: "desc" }, take: 10, include: { parent: { select: { firstName: true } } } },
    },
  });
  if (!e) notFound();
  const [curriculum, reviewStats] = await Promise.all([
    getCurriculum(),
    db.review.aggregate({ where: { educatorId: e.id }, _avg: { rating: true }, _count: true }),
  ]);

  const name = fullName(e.user);
  const now = new Date();
  const photo = e.documents.find((d) => d.type === "PHOTO");
  const missingDocuments = REQUIRED_DOCUMENTS.filter((type) => !e.documents.some((d) => d.type === type));
  const activeTutorings = e.tutorings.filter((t) => t.status === "ACTIVE").length;
  const guarantors = [
    { name: e.guarantor1Name, phone: e.guarantor1Phone, address: e.guarantor1Address },
    { name: e.guarantor2Name, phone: e.guarantor2Phone, address: e.guarantor2Address },
  ];

  // Points contrôlés avant validation : le résultat reste indicatif, la décision appartient à l'administrateur.
  const checks: { ok: boolean; label: string }[] = [
    {
      ok: Boolean(e.birthDate && e.zone && e.degreeLevel && e.occupation && e.subjects.length && e.classLevels.length),
      label: "Profil pédagogique complet",
    },
    { ok: guarantors.every((g) => g.name && g.phone), label: "Deux garants renseignés" },
    {
      ok: e.availabilities.length > 0,
      label: e.availabilities.length ? `${e.availabilities.length} créneau${e.availabilities.length > 1 ? "x" : ""} de disponibilité` : "Aucune disponibilité",
    },
    { ok: Boolean(e.payoutPhone), label: e.payoutPhone ? "Numéro Mobile Money renseigné" : "Numéro Mobile Money manquant" },
    ...(missingDocuments.length
      ? missingDocuments.map((type) => ({ ok: false, label: `${DOCUMENT_TYPES[type]} manquant${type === "PHOTO" ? "e" : ""}` }))
      : [{ ok: true, label: "Pièces obligatoires fournies" }]),
  ];

  return (
    <>
      <BackLink href="/admin/educateurs">Éducateurs</BackLink>
      <DetailHeader
        avatar={<Avatar name={name} documentId={photo?.id} size={72} />}
        title={name}
        badges={
          <>
            <Badge tone={statusTones[e.status]}>{PROFILE_STATUS[e.status]}</Badge>
            {(e.user.status !== "ACTIVE" || isLocked(e.user.lockedUntil)) && <AccountBadge status={e.user.status} lockedUntil={e.user.lockedUntil} />}
          </>
        }
        meta={
          <>
            {e.zone && <MetaItem icon={MapPin}>{e.zone}</MetaItem>}
            <MetaItem icon={Briefcase}>
              {e.experienceYears ?? 0} an{(e.experienceYears ?? 0) > 1 ? "s" : ""} d&apos;expérience
            </MetaItem>
            <MetaItem icon={CalendarDays}>Inscrit le {formatDate(e.user.createdAt)}</MetaItem>
            {e.submittedAt && <MetaItem icon={Send}>Transmis le {formatDate(e.submittedAt)}</MetaItem>}
          </>
        }
        actions={<ContactActions phone={e.user.phone} email={e.user.email} />}
        metrics={
          <>
            <Metric label="Pièces obligatoires" tone={missingDocuments.length > 0 ? "red" : undefined}>
              {REQUIRED_DOCUMENTS.length - missingDocuments.length}
              <span className="text-sm font-normal text-slate-400"> / {REQUIRED_DOCUMENTS.length}</span>
            </Metric>
            <Metric label="Tutorats">
              {activeTutorings} <span className="text-sm font-normal text-slate-400">en cours</span>
            </Metric>
            <Metric label="Avis des familles">
              {reviewStats._count ? (
                <span className="inline-flex items-center gap-1.5">
                  {reviewStats._avg.rating?.toFixed(1).replace(".", ",")}
                  <span className="text-sm font-normal text-slate-400">({reviewStats._count})</span>
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </Metric>
            <Metric label="Dernière connexion">
              <span className="text-sm font-medium">{e.user.lastLoginAt ? formatDateTime(e.user.lastLoginAt) : "Jamais"}</span>
            </Metric>
          </>
        }
      />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card title="Profil pédagogique">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TagGroup title="Matières" tone="brand" items={e.subjects.map((s) => subjectLabel(curriculum, s))} />
              <TagGroup title="Classes" items={e.classLevels} />
            </div>
            <Section title="Disponibilités">
              {e.availabilities.length ? <AvailabilityGrid availabilities={e.availabilities} booked={e.bookedSlots} /> : <p className="text-sm text-slate-500">Aucun créneau renseigné.</p>}
            </Section>
            <Section title="Parcours">
              <BackgroundSummary e={e} />
            </Section>
            {e.bio && (
              <Section title="Présentation aux familles">
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{e.bio}</p>
              </Section>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            <Card title="Identité et contact">
              <dl className="space-y-3 text-sm">
                <Info icon={IdCard} label="NPI" value={<span className="tabular-nums">{e.user.npi}</span>} />
                <Info icon={Mail} label="E-mail" value={e.user.email} />
                <Info icon={Phone} label="Téléphone" value={e.user.phone} />
                <Info icon={House} label="Adresse" value={[e.user.address, e.user.city].filter(Boolean).join(", ") || "—"} />
                <Info
                  icon={Cake}
                  label="Naissance"
                  value={
                    e.birthDate ? (
                      <>
                        {formatDate(e.birthDate)} <span className="font-normal text-slate-400">({age(e.birthDate, now)} ans)</span>
                      </>
                    ) : (
                      "—"
                    )
                  }
                />
                <Info icon={Heart} label="Situation" value={e.maritalStatus || "—"} />
                <Info icon={Wallet} label="Mobile Money" value={payoutAccount(e) ?? "—"} />
              </dl>
            </Card>
            <Card title="Garants">
              <ul className="space-y-3">
                {guarantors.map((g, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200/80 p-3">
                    <Avatar name={g.name || "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className={cx("truncate text-sm font-medium", g.name ? "text-ink" : "text-slate-400")}>{g.name || `Garant ${i + 1} non renseigné`}</p>
                      <p className="truncate text-xs text-slate-500">{[g.phone, g.address].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    {g.phone && (
                      <a href={`tel:${g.phone}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink" aria-label={`Appeler ${g.name ?? "le garant"}`}>
                        <Phone className="size-4" aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Tutorats" action={e.tutorings.length >= 20 ? <span className="text-xs text-slate-400">20 derniers</span> : undefined}>
            {e.tutorings.length === 0 ? (
              <Empty icon={BookOpenCheck} title="Aucun tutorat pour l'instant">
                {e.status === "VALIDATED" ? "Les tutorats demandés par les familles apparaîtront ici." : "Ils apparaîtront ici une fois le dossier validé."}
              </Empty>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {e.tutorings.map((t) => (
                  <TutoringRow key={t.id} tutoring={t} person={fullName(t.child)} title={fullName(t.child)} meta={`${t.classLevel} · ${t.slotsLabel}`} now={now} />
                ))}
              </ul>
            )}
          </Card>

          {e.reviews.length > 0 && (
            <Card title="Avis des familles">
              <ul className="divide-y divide-slate-100">
                {e.reviews.map((r) => (
                  <li key={r.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar name={r.parent.firstName} size={32} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink">{r.parent.firstName}</span>
                        <Stars value={r.rating} />
                        <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.comment}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          <Card title={e.status === "VALIDATED" ? "Validation" : "Vérification"}>
            {e.status === "VALIDATED" ? (
              <div className="mb-4 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-900">
                <p className="font-medium">
                  Validé le {formatDate(e.validatedAt)}
                  {e.validatedBy ? ` par ${fullName(e.validatedBy)}` : ""}
                </p>
                <p className="mt-1 flex items-center gap-2">
                  {e.cycles.join(" · ")} · <Stars value={e.stars} />
                </p>
              </div>
            ) : (
              <ul className="mb-4 space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.label} className={cx("flex items-center gap-2.5", !c.ok && "text-rose-700")}>
                    <span className={cx("flex size-5 shrink-0 items-center justify-center rounded-full [&_svg]:size-3", c.ok ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")} aria-hidden>
                      {c.ok ? <Check strokeWidth={3} /> : <X strokeWidth={3} />}
                    </span>
                    {c.label}
                  </li>
                ))}
              </ul>
            )}
            {e.status === "REJECTED" && e.rejectionReason && (
              <p className="mb-4 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-800">
                <span className="font-medium">Motif du rejet :</span> {e.rejectionReason}
              </p>
            )}
            {e.status === "INCOMPLETE" ? (
              <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">Dossier pas encore transmis par l&apos;éducateur.</p>
            ) : (
              <div className="border-t border-slate-100 pt-4">
                <EducatorDecisionForms educatorId={e.id} validated={e.status === "VALIDATED"} defaults={{ stars: e.stars ?? undefined, cycles: e.cycles }} />
              </div>
            )}
          </Card>

          <Card title="Pièces justificatives">
            <ul className="space-y-2">
              {(Object.keys(DOCUMENT_TYPES) as DocumentType[]).map((type) => {
                const doc = e.documents.find((d) => d.type === type);
                const required = (REQUIRED_DOCUMENTS as readonly DocumentType[]).includes(type);
                const Icon = doc ? documentIcons[type] : required ? FileX : documentIcons[type];
                return (
                  <li
                    key={type}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border p-2.5",
                      doc ? "border-slate-200/80" : required ? "border-dashed border-rose-300 bg-rose-50/40" : "border-slate-200/80",
                    )}
                  >
                    <span
                      className={cx(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4",
                        doc ? "bg-brand-50 text-brand-600" : required ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400",
                      )}
                      aria-hidden
                    >
                      <Icon />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{DOCUMENT_TYPES[type]}</p>
                      <p className={cx("text-xs", doc ? "text-slate-500" : required ? "text-rose-600" : "text-slate-400")}>
                        {doc ? `${fileFormat(doc.mimeType)} · ${fileSize(doc.size)}` : required ? "Manquant · obligatoire" : "Non fourni · facultatif"}
                      </p>
                    </div>
                    {doc && (
                      <a href={`/api/fichiers/${doc.id}`} target="_blank" rel="noopener" className="rounded-lg px-2.5 py-1.5 text-13px font-medium text-brand-700 transition hover:bg-brand-50">
                        Ouvrir
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <h2 className="text-15px font-semibold tracking-tight text-ink">Compte</h2>
            <p className="mt-0.5 mb-4 text-13px text-slate-500">{accountSummary(e.user.status, e.user.lockedUntil)}</p>
            <AccountManagement userId={e.userId} status={e.user.status} lockedUntil={e.user.lockedUntil} />
          </Card>
        </aside>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function TagGroup({ title, items, tone = "slate" }: { title: string; items: string[]; tone?: "brand" | "slate" }) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((item) => (
            <span key={item} className={cx("rounded-lg px-2.5 py-1 text-13px font-medium", tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700")}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </div>
    </div>
  );
}
