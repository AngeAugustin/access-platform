import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { CtaBand, EmptyNote, PageHero, Section } from "@/components/marketing";
import { Stars } from "@/components/ui";
import { publicReviews } from "@/server/queries/public";

export const metadata: Metadata = {
  title: "Avis des familles",
  description: "Les avis laissés par les parents à la fin de leurs tutorats Access.",
};

export default async function ReviewsPage() {
  const { reviews, average, count } = await publicReviews(30);

  return (
    <>
      <PageHero eyebrow="Avis des familles" title="Ce que disent les parents.">
        <p>
          Ces avis sont laissés par les parents à la fin d&apos;un tutorat, depuis leur espace. Seul un parent ayant suivi un tutorat peut en publier un. Nous ne les
          modifions pas ; seul un avis abusif peut être retiré.
        </p>
        {count > 0 && average !== null && (
          <div className="mt-8 inline-flex items-center gap-4 rounded-3xl bg-canvas px-6 py-4">
            <span className="font-display text-5xl font-extrabold tracking-tight text-ink">{average.toFixed(1).replace(".", ",")}</span>
            <span>
              <Stars value={average} size="md" />
              <span className="mt-1 block text-sm text-slate-500">
                Moyenne de {count} avis
              </span>
            </span>
          </div>
        )}
      </PageHero>

      <Section>
        {reviews.length ? (
          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {reviews.map((r) => (
              <li key={r.id} className="mb-5 break-inside-avoid rounded-[28px] bg-white p-7 shadow-[0_0_0_1px_rgb(15_23_42/0.07)]">
                <Stars value={r.rating} />
                <blockquote className="mt-4 text-[17px] leading-relaxed text-slate-700">« {r.comment} »</blockquote>
                <p className="mt-5 text-sm text-slate-500">
                  <span className="font-semibold text-ink">{r.parent.firstName}</span>, parent d&apos;un élève de {r.tutoring.classLevel} · tutorat avec{" "}
                  {r.educator.user.firstName} · {formatDate(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>
            Les premiers avis arriveront à la fin des premiers tutorats. En attendant, découvrez <Link href="/confiance" className="font-semibold text-brand-700">comment nous
            vérifions nos éducateurs</Link>.
          </EmptyNote>
        )}
      </Section>

      <CtaBand title="Votre enfant mérite le bon accompagnement." />
    </>
  );
}
