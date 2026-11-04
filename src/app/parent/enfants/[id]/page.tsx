import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, GraduationCap, Pencil, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/dal";
import { SUBJECT_LEVELS } from "@/lib/constants";
import { cycleOfClass, subjectLabel, subjectsForClass } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";
import { age, formatDate, fullName } from "@/lib/format";
import { DefinitionList, cx } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { TutoringBadge } from "@/components/status";
import { KidChips, display, panel } from "@/components/parent/kit";

export const metadata = { title: "Fiche enfant" };

// La fiche se lit comme un carnet : un onglet par sujet, choisi dans l'URL.
const TABS = [
  { key: "apercu", label: "Aperçu" },
  { key: "matieres", label: "Matières" },
  { key: "suivi", label: "Suivi" },
  { key: "infos", label: "Infos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Colonnes du bulletin, de la plus faible à la meilleure.
const LEVELS = [
  { key: "WEAK", short: "F", dot: "bg-rose-500" },
  { key: "AVERAGE", short: "M", dot: "bg-accent-500" },
  { key: "GOOD", short: "B", dot: "bg-brand-600" },
  { key: "VERY_GOOD", short: "TB", dot: "bg-emerald-500" },
] as const;

// Nombre de matières montrées dans l'aperçu avant le lien vers l'onglet complet.
const PREVIEW_SUBJECTS = 5;

export default async function ChildPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const user = await requireRole("PARENT");
  const [{ id }, { onglet }] = await Promise.all([params, searchParams]);
  const tab: TabKey = TABS.find((t) => t.key === onglet)?.key ?? "apercu";
  const [child, kids, curriculum] = await Promise.all([
    db.child.findFirst({
      where: { id, parentId: user.id },
      include: {
        subjectLevels: true,
        tutorings: { include: { educator: { include: { user: true, documents: { where: { type: "PHOTO" }, select: { id: true } } } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    db.child.findMany({ where: { parentId: user.id }, orderBy: { firstName: "asc" } }),
    getCurriculum(),
  ]);
  if (!child) notFound();

  const base = `/parent/enfants/${child.id}`;
  const findEducator = `/parent/educateurs?classe=${encodeURIComponent(child.currentClass)}&enfant=${child.id}`;
  const cycle = cycleOfClass(curriculum, child.currentClass);
  // Matières dans l'ordre du référentiel de la classe, puis celles qui n'y figurent plus.
  const order = subjectsForClass(curriculum, child.currentClass);
  const levels = [...child.subjectLevels].sort((a, b) => rank(order, a.subject) - rank(order, b.subject));
  const priorities = levels.filter((l) => l.level === "WEAK" || l.level === "AVERAGE");
  const active = child.tutorings.find((t) => t.status === "ACTIVE");
  const likes = [child.favoriteSubjects, child.interests]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/parent/enfants" className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden /> Mes enfants
        </Link>
        <Link href={`${base}/modifier`} className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
          <Pencil className="size-3.5" aria-hidden /> Modifier
        </Link>
      </div>
      {kids.length > 1 && <KidChips kids={kids} current={child.id} hrefFor={(kidId) => `/parent/enfants/${kidId}`} />}

      <section className={cx(panel, "overflow-hidden")}>
        <header className="px-5 pt-7 pb-5 text-center">
          <span className="mx-auto block w-fit rounded-full bg-accent-400 p-[3px]">
            <Avatar name={fullName(child)} size={84} />
          </span>
          <h1 className={cx(display, "mt-3 text-2xl leading-tight font-bold break-words text-ink sm:text-[28px]")}>{fullName(child)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {age(child.birthDate)} ans{child.currentSchool && ` · ${child.currentSchool}`}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-brand-600 px-3.5 py-1 text-13px font-semibold text-white">{[cycle, child.currentClass].filter(Boolean).join(" · ")}</p>
        </header>

        <nav aria-label="Rubriques de la fiche" className="flex border-b border-slate-100 px-2 sm:px-5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "apercu" ? base : `${base}?onglet=${t.key}`}
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className={cx(
                "-mb-px flex-1 border-b-2 py-3 text-center text-sm font-semibold transition",
                tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="animate-fade-in p-5 sm:p-6">
          {tab === "apercu" && (
            <div className="space-y-6">
              {active ? (
                <TutoringRow tutoring={active} />
              ) : (
                <div className="rounded-[18px] border border-accent-200 bg-accent-50 p-4">
                  {priorities.length > 0 ? (
                    <>
                      <p className="text-13px font-semibold text-accent-800">À travailler en priorité</p>
                      <p className="mt-0.5 text-15px font-semibold text-ink">{priorities.map((l) => subjectLabel(curriculum, l.subject)).join(", ")}</p>
                    </>
                  ) : (
                    <p className="flex items-center gap-2 text-15px font-semibold text-ink">
                      <Sparkles className="size-4 text-accent-600" aria-hidden /> Bon niveau dans toutes les matières
                    </p>
                  )}
                  <Link href={findEducator} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    Trouver un éducateur en {child.currentClass} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              )}

              <div>
                <h2 className={cx(display, "text-lg font-bold text-ink")}>Bulletin de niveau</h2>
                <Bulletin rows={levels.slice(0, PREVIEW_SUBJECTS)} label={(s) => subjectLabel(curriculum, s)} />
                {levels.length > PREVIEW_SUBJECTS && (
                  <Link href={`${base}?onglet=matieres`} scroll={false} className="mt-2 block text-center text-13px font-semibold text-brand-700 hover:text-brand-800">
                    + {levels.length - PREVIEW_SUBJECTS} matière{levels.length - PREVIEW_SUBJECTS > 1 && "s"}
                  </Link>
                )}
              </div>

              {likes.length > 0 && (
                <div>
                  <h2 className={cx(display, "text-lg font-bold text-ink")}>Aime</h2>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {likes.map((l) => (
                      <li key={l} className="rounded-full bg-slate-100 px-3 py-1 text-13px font-medium text-slate-700">
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "matieres" && (
            <div>
              <p className="text-13px text-slate-500">Renseigné par vous, partagé avec l&apos;éducateur.</p>
              <Bulletin rows={levels} label={(s) => subjectLabel(curriculum, s)} />
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {LEVELS.map((l) => (
                  <li key={l.key} className="flex items-center gap-1.5">
                    <span className={cx("size-2 rounded-full", l.dot)} aria-hidden />
                    {l.short} : {SUBJECT_LEVELS[l.key]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === "suivi" && (
            <div>
              {child.tutorings.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun tutorat pour l&apos;instant.</p>
              ) : (
                <ul className="space-y-2.5">
                  {child.tutorings.map((t) => (
                    <li key={t.id}>
                      <TutoringRow tutoring={t} />
                    </li>
                  ))}
                </ul>
              )}
              <Link href={findEducator} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                <GraduationCap className="size-4" aria-hidden /> {child.tutorings.length === 0 ? "Trouver un éducateur" : `Un autre éducateur pour ${child.firstName}`}
              </Link>
            </div>
          )}

          {tab === "infos" && (
            <DefinitionList
              items={[
                ["Sexe", child.sex === "F" ? "Fille" : "Garçon"],
                ["Date de naissance", formatDate(child.birthDate)],
                ["NPI", child.npi ?? "—"],
                ["Classe actuelle", child.currentClass],
                ["École actuelle", child.currentSchool ?? "—"],
                ["Classe précédente", child.previousClass ?? "—"],
                ["École précédente", child.previousSchool ?? "—"],
                ["Matières préférées", child.favoriteSubjects ?? "—"],
                ["Centres d'intérêt", child.interests ?? "—"],
              ]}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function rank(order: string[], subject: string) {
  const i = order.indexOf(subject);
  return i === -1 ? order.length : i;
}

// Une ligne par matière, une coche dans la colonne du niveau, comme sur un bulletin scolaire.
function Bulletin({ rows, label }: { rows: { id: string; subject: string; level: keyof typeof SUBJECT_LEVELS }[]; label: (subject: string) => string }) {
  return (
    <table className="mt-3 w-full border-collapse text-sm">
      <thead>
        <tr className="text-xs text-slate-400">
          <th scope="col" className="pb-2 text-left font-medium">
            <span className="sr-only">Matière</span>
          </th>
          {LEVELS.map((l) => (
            <th key={l.key} scope="col" className="w-11 pb-2 font-semibold" title={SUBJECT_LEVELS[l.key]}>
              {l.short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-slate-100">
            <th scope="row" className="py-2.5 pr-2 text-left font-semibold text-ink">
              {label(r.subject)}
              <span className="sr-only"> : {SUBJECT_LEVELS[r.level]}</span>
            </th>
            {LEVELS.map((l) => (
              <td key={l.key} className="text-center" aria-hidden>
                {r.level === l.key ? <span className={cx("mx-auto block size-3 rounded-full", l.dot)} /> : <span className="mx-auto block size-1 rounded-full bg-slate-200" />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type TutoringItem = {
  id: string;
  status: Parameters<typeof TutoringBadge>[0]["status"];
  slotsLabel: string;
  startDate: Date;
  endDate: Date;
  educator: { user: { firstName: string; lastName: string }; documents: { id: string }[] };
};

function TutoringRow({ tutoring: t }: { tutoring: TutoringItem }) {
  const live = t.status === "ACTIVE";
  return (
    <Link
      href={`/parent/tutorats/${t.id}`}
      className={cx("flex items-center gap-3 rounded-[18px] p-4 transition", live ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-slate-50 hover:bg-slate-100")}
    >
      <Avatar name={fullName(t.educator.user)} documentId={t.educator.documents[0]?.id} size={44} />
      <span className="min-w-0 flex-1">
        {live && <span className="block text-xs font-semibold text-brand-200">Tutorat en cours</span>}
        <span className="block truncate text-15px font-semibold">{fullName(t.educator.user)}</span>
        <span className={cx("mt-0.5 block truncate text-13px", live ? "text-brand-200" : "text-slate-500")}>
          {live ? t.slotsLabel : `${formatDate(t.startDate)} → ${formatDate(t.endDate)}`}
        </span>
      </span>
      {live ? <ChevronRight className="size-5 text-brand-300" aria-hidden /> : <TutoringBadge status={t.status} />}
    </Link>
  );
}
