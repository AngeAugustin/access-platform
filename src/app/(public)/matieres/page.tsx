import type { Metadata } from "next";
import Link from "next/link";
import { activeSubjects, subjectLabel } from "@/lib/curriculum";
import { CtaBand, EmptyNote, PageHero, pillDark, Section } from "@/components/marketing";
import { getCurriculum } from "@/server/queries/curriculum";

export const metadata: Metadata = {
  title: "Matières et classes",
  description: "Répétiteurs à domicile à Cotonou et Abomey-Calavi : toutes les classes et matières couvertes par Access.",
};

export default async function SubjectsPage() {
  const curriculum = await getCurriculum();
  const classes = curriculum.classes.filter((c) => c.active);
  const subjects = activeSubjects(curriculum);

  return (
    <>
      <PageHero
        eyebrow="Matières et classes"
        title="Du collège à la terminale, dans les matières qui comptent."
        actions={
          <Link href="/inscription?role=PARENT" className={pillDark}>
            Trouver un éducateur
          </Link>
        }
      >
        <p>Access couvre les classes et matières ci-dessous, à domicile, à Cotonou et Abomey-Calavi.</p>
      </PageHero>

      <Section eyebrow="Matières" title={`${subjects.length} matière${subjects.length > 1 ? "s" : ""}.`}>
        {subjects.length ? (
          <ul className="flex flex-wrap gap-2.5">
            {subjects.map((s) => (
              <li key={s.key} className="rounded-full bg-brand-50 px-5 py-2.5 text-base font-semibold text-brand-800">
                {s.label}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>Le référentiel est en cours de mise à jour.</EmptyNote>
        )}
      </Section>

      {classes.length > 0 && (
        <Section eyebrow="Classes" title="Ce qui est suivi dans chaque classe." intro={<p>Pour chaque classe, les matières dans lesquelles vous indiquez le niveau de votre enfant.</p>}>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <li key={c.name} className="rounded-[28px] bg-canvas p-7">
                <h3 className="font-display text-2xl font-bold tracking-tight text-ink">{c.name}</h3>
                {c.subjects.length ? (
                  <p className="mt-3 text-15px leading-relaxed text-slate-600">{c.subjects.map((k) => subjectLabel(curriculum, k)).join(" · ")}</p>
                ) : (
                  <p className="mt-3 text-15px text-slate-500">Toutes matières sur demande.</p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <CtaBand title="Trouvez un répétiteur pour la bonne matière." />
    </>
  );
}
