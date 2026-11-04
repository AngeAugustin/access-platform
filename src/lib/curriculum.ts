// Référentiel scolaire (classes et matières), stocké en base et géré depuis /admin/referentiel.
// Hormis loadCurriculum, ce module ne manipule que des données déjà chargées : il est utilisable côté navigateur.
import type { PrismaClient } from "@/generated/prisma/client";

export type CurriculumSubject = { key: string; label: string; active: boolean };
// `subjects` : clés des matières actives évaluées dans la classe, dans l'ordre du référentiel.
export type CurriculumClass = { name: string; cycle: string; active: boolean; subjects: string[] };
export type Curriculum = { classes: CurriculumClass[]; subjects: CurriculumSubject[] };

export function activeClasses(curriculum: Curriculum): string[] {
  return curriculum.classes.filter((c) => c.active).map((c) => c.name);
}

export function activeSubjects(curriculum: Curriculum): CurriculumSubject[] {
  return curriculum.subjects.filter((s) => s.active);
}

// Classes actives d'un cycle, dans l'ordre du référentiel.
export function activeClassesOfCycle(curriculum: Curriculum, cycle: string): string[] {
  return curriculum.classes.filter((c) => c.active && c.cycle === cycle).map((c) => c.name);
}

export function cycleOfClass(curriculum: Curriculum, className: string): string | undefined {
  return curriculum.classes.find((c) => c.name === className)?.cycle;
}

export function subjectsForClass(curriculum: Curriculum, className: string): string[] {
  return curriculum.classes.find((c) => c.name === className)?.subjects ?? [];
}

export function subjectLabel(curriculum: Curriculum, key: string): string {
  return curriculum.subjects.find((s) => s.key === key)?.label ?? key;
}

// Clé technique d'une nouvelle matière : « Mathématiques financières » → « mathematiques-financieres ».
export function subjectKeyFromLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function loadCurriculum(client: Pick<PrismaClient, "classLevel" | "subject">): Promise<Curriculum> {
  const [classes, subjects] = await Promise.all([
    client.classLevel.findMany({ orderBy: { position: "asc" }, include: { subjects: { include: { subject: true } } } }),
    client.subject.findMany({ orderBy: { position: "asc" } }),
  ]);
  return {
    classes: classes.map((c) => ({
      name: c.name,
      cycle: c.cycle,
      active: c.active,
      subjects: c.subjects
        .map((l) => l.subject)
        .filter((s) => s.active)
        .sort((a, b) => a.position - b.position)
        .map((s) => s.key),
    })),
    subjects: subjects.map((s) => ({ key: s.key, label: s.label, active: s.active })),
  };
}
