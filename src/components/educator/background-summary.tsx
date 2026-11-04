import { readExperiences } from "@/lib/educator-dossier";

type BackgroundFields = {
  degreeLevel: string | null;
  degreeField: string | null;
  degreeSchool: string | null;
  degreeYear: number | null;
  occupation: string | null;
  occupationPlace: string | null;
  experiences: unknown;
  achievements: string | null;
  background: string | null;
};

const join = (...parts: (string | number | null | undefined)[]) => parts.filter(Boolean).join(" · ");

// Parcours détaillé d'un éducateur ; à défaut, le texte libre des anciens dossiers.
export function BackgroundSummary({ e }: { e: BackgroundFields }) {
  if (!e.degreeLevel) {
    return <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{e.background || "—"}</p>;
  }
  const experiences = readExperiences(e.experiences);
  return (
    <dl className="space-y-4 text-sm">
      <div>
        <dt className="text-13px font-medium text-slate-500">Diplôme</dt>
        <dd className="mt-0.5 font-semibold text-ink">{join(e.degreeLevel, e.degreeField)}</dd>
        {(e.degreeSchool || e.degreeYear) && <dd className="text-slate-600">{join(e.degreeSchool, e.degreeYear)}</dd>}
      </div>
      {e.occupation && (
        <div>
          <dt className="text-13px font-medium text-slate-500">Aujourd&apos;hui</dt>
          <dd className="mt-0.5 text-slate-700">{join(e.occupation, e.occupationPlace)}</dd>
        </div>
      )}
      {experiences.length > 0 && (
        <div>
          <dt className="text-13px font-medium text-slate-500">Expériences d&apos;enseignement</dt>
          <dd>
            <ul className="mt-1.5 space-y-2 border-l-2 border-brand-100 pl-4">
              {experiences.map((x, i) => (
                <li key={i}>
                  <p className="font-medium text-ink">{x.role}</p>
                  <p className="text-slate-600">
                    {x.place} · {x.to ? (x.to === x.from ? x.from : `${x.from} – ${x.to}`) : `depuis ${x.from}`}
                  </p>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      {e.achievements && (
        <div>
          <dt className="text-13px font-medium text-slate-500">Résultats et références</dt>
          <dd className="mt-0.5 leading-relaxed whitespace-pre-line text-slate-700">{e.achievements}</dd>
        </div>
      )}
    </dl>
  );
}
