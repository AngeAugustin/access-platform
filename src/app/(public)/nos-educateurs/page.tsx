import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { subjectLabel } from "@/lib/curriculum";
import { CtaBand, EmptyNote, PageHero, pillDark, pillLight, Section } from "@/components/marketing";
import { Stars } from "@/components/ui";
import { getCurriculum } from "@/server/queries/curriculum";
import { countValidatedEducators, publicEducators } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Nos éducateurs",
  description: "Des éducateurs dont l'identité, le casier judiciaire et les diplômes ont été vérifiés par Access.",
};

export default async function EducatorsShowcasePage() {
  const [educators, total, curriculum] = await Promise.all([publicEducators(12), countValidatedEducators(), getCurriculum()]);

  return (
    <>
      <PageHero
        eyebrow="Nos éducateurs"
        title="Des éducateurs vérifiés, près de chez vous."
        actions={
          <>
            <Link href="/inscription?role=PARENT" className={pillDark}>
              Voir tous les profils
            </Link>
            <Link href="/confiance" className={pillLight}>
              Comment nous les vérifions
            </Link>
          </>
        }
      >
        <p>
          Chaque éducateur présenté ici a transmis sa pièce d&apos;identité, son casier judiciaire, ses diplômes et deux garants, et son dossier a été validé par
          l&apos;équipe Access. Créez votre compte pour consulter les profils complets, leurs disponibilités et les avis des familles.
        </p>
      </PageHero>

      <Section
        eyebrow="Aperçu"
        title={total > 0 ? `${total} éducateur${total > 1 ? "s" : ""} validé${total > 1 ? "s" : ""}.` : "Bientôt nos premiers éducateurs."}
      >
        {educators.length ? (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {educators.map((e) => (
              <li key={e.id} className="flex flex-col rounded-[28px] bg-white p-7 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 font-display text-lg font-bold text-brand-700" aria-hidden>
                    {e.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight text-ink">
                      {e.displayName}
                      <BadgeCheck className="size-5 shrink-0 text-brand-600" aria-label="Dossier vérifié" />
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {[e.cycles.join(", "), e.experienceYears ? `${e.experienceYears} an${e.experienceYears > 1 ? "s" : ""} d'expérience` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                  {e.stars ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Stars value={e.stars} />
                      <span className="text-slate-500">note Access</span>
                    </span>
                  ) : null}
                  {e.avgRating !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                      {e.avgRating.toFixed(1).replace(".", ",")} · {e.reviewCount} avis
                    </span>
                  )}
                  {e.zone && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-4 text-slate-400" aria-hidden />
                      {e.zone}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {e.subjects.slice(0, 5).map((s) => (
                    <span key={s} className="rounded-full bg-canvas px-3 py-1 text-13px font-medium text-slate-700">
                      {subjectLabel(curriculum, s)}
                    </span>
                  ))}
                </div>
                {e.classLevels.length > 0 && <p className="mt-4 text-13px text-slate-500">Classes : {e.classLevels.join(", ")}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>
            Les premiers dossiers sont en cours de vérification. Vous êtes éducateur ? <Link href="/devenir-educateur" className="font-semibold text-brand-700">Rejoignez Access</Link>.
          </EmptyNote>
        )}
      </Section>

      <CtaBand title="Trouvez l'éducateur qui convient à votre enfant." />
    </>
  );
}
