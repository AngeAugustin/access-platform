"use client";

import { useState } from "react";
import { CYCLES } from "@/lib/constants";

type CatalogClass = { name: string; cycle: string; subjects: string[] };

// Filtres liés du catalogue : le cycle restreint les classes, la classe (ou à défaut le cycle) restreint les matières.
export function CycleClassSelect({
  classes,
  subjects,
  defaultCycle,
  defaultClass,
  defaultSubject,
}: {
  classes: CatalogClass[];
  subjects: { key: string; label: string }[];
  defaultCycle?: string;
  defaultClass?: string;
  defaultSubject?: string;
}) {
  const [cycle, setCycle] = useState(defaultCycle ?? "");
  const [classe, setClasse] = useState(defaultClass ?? "");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const cycleOf = (name: string) => classes.find((c) => c.name === name)?.cycle ?? "";
  const shownClasses = cycle ? classes.filter((c) => c.cycle === cycle) : classes;
  const scope = classe ? classes.filter((c) => c.name === classe) : cycle ? shownClasses : null;
  const allowed = scope && new Set(scope.flatMap((c) => c.subjects));
  const shownSubjects = allowed ? subjects.filter((s) => allowed.has(s.key)) : subjects;
  // Une matière qui n'est plus enseignée dans la sélection est retirée.
  const subjectValue = shownSubjects.some((s) => s.key === subject) ? subject : "";

  return (
    <>
      <select
        name="cycle"
        value={cycle}
        onChange={(e) => {
          setCycle(e.target.value);
          if (e.target.value && cycleOf(classe) !== e.target.value) setClasse("");
        }}
        className="field"
        aria-label="Cycle"
      >
        <option value="">Tous les cycles</option>
        {CYCLES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        name="classe"
        value={classe}
        onChange={(e) => {
          setClasse(e.target.value);
          if (e.target.value) setCycle(cycleOf(e.target.value));
        }}
        className="field"
        aria-label="Classe"
      >
        <option value="">Toutes les classes</option>
        {shownClasses.map((c) => (
          <option key={c.name}>{c.name}</option>
        ))}
      </select>
      <select name="matiere" value={subjectValue} onChange={(e) => setSubject(e.target.value)} className="field" aria-label="Matière">
        <option value="">Toutes les matières</option>
        {shownSubjects.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </>
  );
}
