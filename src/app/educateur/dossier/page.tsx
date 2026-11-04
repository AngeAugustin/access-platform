import Link from "next/link";
import { BadgeCheck, Check, CircleCheck, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { DOCUMENT_TYPES, REQUIRED_DOCUMENTS } from "@/lib/constants";
import { DOSSIER_STEPS, type DossierStepKey, dossierProgress, readExperiences } from "@/lib/educator-dossier";
import { formatDate } from "@/lib/format";
import { Card, Notice, PageHeader, Stars, cx } from "@/components/ui";
import { ProfileBadge } from "@/components/status";
import { BackgroundStep, CoursesStep, type EducatorDefaults, GuarantorsStep, ProfileStep, SubmitProfileButton } from "@/components/educator/profile-form";
import { DocumentUpload } from "@/components/educator/document-upload";
import { getCurriculum } from "@/server/queries/curriculum";

export const metadata = { title: "Mon dossier" };

const profileInclude = { documents: true, availabilities: true, bookedSlots: true } as const;

// Lecture simple d'abord : un upsert avec include charge les relations en parallèle dans une transaction,
// ce que pg signale comme des requêtes simultanées sur un même client.
async function loadProfile(userId: string) {
  const profile = await db.educatorProfile.findUnique({ where: { userId }, include: profileInclude });
  if (profile) return profile;
  await db.educatorProfile.upsert({ where: { userId }, create: { userId }, update: {} });
  return db.educatorProfile.findUniqueOrThrow({ where: { userId }, include: profileInclude });
}

export default async function DossierPage({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const user = await requireRole("EDUCATOR");
  const [profile, curriculum, { etape }] = await Promise.all([loadProfile(user.id), getCurriculum(), searchParams]);
  const validated = profile.status === "VALIDATED";
  const progress = dossierProgress({
    ...profile,
    availabilityCount: profile.availabilities.length,
    documentTypes: profile.documents.map((d) => d.type),
  });
  // Sans étape dans l'adresse : la première encore incomplète.
  const step: DossierStepKey =
    DOSSIER_STEPS.find((s) => s.key === etape)?.key ?? DOSSIER_STEPS.find((s) => !progress[s.key])?.key ?? DOSSIER_STEPS[0].key;
  const index = DOSSIER_STEPS.findIndex((s) => s.key === step);
  const current = DOSSIER_STEPS[index];

  const defaults: EducatorDefaults = {
    birthDate: profile.birthDate?.toISOString().slice(0, 10),
    maritalStatus: profile.maritalStatus ?? undefined,
    zone: profile.zone ?? undefined,
    bio: profile.bio ?? undefined,
    degreeLevel: profile.degreeLevel ?? undefined,
    degreeField: profile.degreeField ?? undefined,
    degreeSchool: profile.degreeSchool ?? undefined,
    degreeYear: profile.degreeYear ?? undefined,
    occupation: profile.occupation ?? undefined,
    occupationPlace: profile.occupationPlace ?? undefined,
    experienceYears: profile.experienceYears ?? undefined,
    experiences: readExperiences(profile.experiences),
    achievements: profile.achievements ?? undefined,
    background: profile.background ?? undefined,
    subjects: profile.subjects,
    cycles: profile.cycles,
    classLevels: profile.classLevels,
    guarantor1Name: profile.guarantor1Name ?? undefined,
    guarantor1Address: profile.guarantor1Address ?? undefined,
    guarantor1Phone: profile.guarantor1Phone ?? undefined,
    guarantor2Name: profile.guarantor2Name ?? undefined,
    guarantor2Address: profile.guarantor2Address ?? undefined,
    guarantor2Phone: profile.guarantor2Phone ?? undefined,
    payoutPhone: profile.payoutPhone ?? undefined,
    payoutOperator: profile.payoutOperator ?? undefined,
    availabilities: profile.availabilities.map((a) => `${a.day}|${a.slot}`),
    booked: profile.bookedSlots.map((b) => `${b.day}|${b.slot}`),
  };

  return (
    <>
      <PageHeader title="Mon dossier" subtitle={<span className="flex items-center gap-2">Statut <ProfileBadge status={profile.status} /></span>} />
      {profile.status === "REJECTED" && (
        <div className="mb-6">
          <Notice tone="red" title="Dossier à corriger">
            {profile.rejectionReason}. Corrigez-le puis transmettez-le à nouveau.
          </Notice>
        </div>
      )}
      {validated && (
        <div className="mb-6">
          <Notice tone="green" icon={BadgeCheck} title={`Dossier vérifié le ${formatDate(profile.validatedAt)}`}>
            <span className="flex flex-wrap items-center gap-2">
              {profile.cycles.join(" · ")} · <Stars value={profile.stars} />
            </span>
          </Notice>
        </div>
      )}
      <Card>
        <Stepper current={step} progress={progress} />
        <div className="mb-6">
          <p className="text-13px font-semibold tracking-[0.06em] text-brand-600 uppercase">
            Étape {index + 1} sur {DOSSIER_STEPS.length}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">{current.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{current.hint}</p>
        </div>
        {/* key : chaque étape repart de ses propres valeurs enregistrées. */}
        <div key={step} className="animate-fade-in">
          {step === "profil" && <ProfileStep defaults={defaults} />}
          {step === "parcours" && <BackgroundStep defaults={defaults} />}
          {step === "cours" && <CoursesStep curriculum={curriculum} defaults={defaults} />}
          {step === "garants" && <GuarantorsStep defaults={defaults} />}
          {step === "pieces" && (
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <p className="text-sm text-slate-500">PDF, JPG ou PNG, 5 Mo maximum. Seule votre photo est visible des familles.</p>
                {(Object.entries(DOCUMENT_TYPES) as [keyof typeof DOCUMENT_TYPES, string][]).map(([type, label]) => {
                  const doc = profile.documents.find((d) => d.type === type);
                  return (
                    <DocumentUpload
                      key={type}
                      type={type}
                      label={label}
                      required={(REQUIRED_DOCUMENTS as readonly string[]).includes(type)}
                      accept={type === "PHOTO" ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"}
                      current={doc ? { id: doc.id, name: doc.originalName } : undefined}
                      locked={validated && type !== "PHOTO"}
                    />
                  );
                })}
              </div>
              <div className="rounded-2xl bg-canvas p-5">
                <p className="font-semibold text-ink">Récapitulatif</p>
                <ul className="mt-3 space-y-2.5">
                  {DOSSIER_STEPS.map((s) => (
                    <li key={s.key}>
                      <Link href={`?etape=${s.key}`} className={cx("flex items-center gap-2.5 text-sm hover:text-brand-700", progress[s.key] ? "text-slate-700" : "text-slate-500")}>
                        {progress[s.key] ? <CircleCheck className="size-4 text-emerald-500" aria-hidden /> : <Circle className="size-4 text-slate-300" aria-hidden />}
                        {s.label}
                        {!progress[s.key] && <span className="ml-auto text-xs font-medium text-accent-600">À compléter</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {(profile.status === "INCOMPLETE" || profile.status === "REJECTED") && (
                  <div className="mt-5 border-t border-slate-200 pt-5">
                    <SubmitProfileButton />
                  </div>
                )}
                {profile.status === "SUBMITTED" && <p className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-600">Dossier transmis : Access le vérifie.</p>}
              </div>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

// Étapes du dossier : on peut ouvrir n'importe laquelle, une coche marque celles qui sont complètes.
function Stepper({ current, progress }: { current: DossierStepKey; progress: Record<DossierStepKey, boolean> }) {
  return (
    <nav aria-label="Étapes du dossier" className="mb-8">
      <ol className="flex items-center gap-1.5">
        {DOSSIER_STEPS.map((s, i) => {
          const active = s.key === current;
          const done = progress[s.key];
          return (
            <li key={s.key} className={cx("flex items-center gap-1.5", i < DOSSIER_STEPS.length - 1 && "flex-1")}>
              <Link href={`?etape=${s.key}`} aria-current={active ? "step" : undefined} className="flex items-center gap-2 rounded-full transition hover:opacity-80">
                <span
                  className={cx(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition",
                    active && "bg-brand-600 text-white ring-4 ring-brand-100",
                    !active && done && "bg-brand-600 text-white",
                    !active && !done && "bg-slate-100 text-slate-400",
                  )}
                >
                  {done && !active ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={cx("text-sm font-semibold", active || done ? "text-ink" : "text-slate-400", !active && "max-md:sr-only")}>{s.label}</span>
              </Link>
              {i < DOSSIER_STEPS.length - 1 && <span className={cx("h-0.5 min-w-2 flex-1 rounded-full", done ? "bg-brand-600" : "bg-slate-200")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
