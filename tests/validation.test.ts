import { describe, expect, it } from "vitest";
import { classLevelSchema, lessonSchema, passwordSchema, subjectSchema, phoneSchema, registerSchema, registerStepSchemas } from "@/lib/validation";
import { type Curriculum, activeClasses, activeSubjects, subjectKeyFromLabel, subjectLabel, subjectsForClass } from "@/lib/curriculum";

describe("validation", () => {
  it("impose un mot de passe d'au moins 10 caractères avec lettre et chiffre", () => {
    expect(passwordSchema.safeParse("court1").success).toBe(false);
    expect(passwordSchema.safeParse("seulementdeslettres").success).toBe(false);
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
    expect(passwordSchema.safeParse("Bonjour2026").success).toBe(true);
  });

  it("normalise les numéros béninois", () => {
    expect(phoneSchema.parse("01 97 00 00 00")).toBe("0197000000");
    expect(phoneSchema.parse("+229 97 00 00 00")).toBe("+22997000000");
    expect(phoneSchema.safeParse("abc").success).toBe(false);
  });

  it("refuse l'inscription d'un administrateur", () => {
    const base = {
      npi: "1234567890",
      firstName: "A",
      lastName: "B",
      email: "a@b.bj",
      phone: "0197000000",
      password: "Bonjour2026",
      confirmPassword: "Bonjour2026",
      acceptTerms: "on",
    };
    expect(registerSchema.safeParse({ ...base, role: "PARENT" }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
  });

  it("valide l'inscription étape par étape", () => {
    expect(registerStepSchemas[0].safeParse({ role: "PARENT" }).success).toBe(true);
    expect(registerStepSchemas[0].safeParse({ role: "ADMIN" }).success).toBe(false);
    expect(
      registerStepSchemas[1].safeParse({
        npi: "1234567890",
        firstName: "A",
        lastName: "B",
        email: "a@b.bj",
        phone: "0197000000",
      }).success,
    ).toBe(true);
    expect(registerStepSchemas[2].safeParse({ password: "Bonjour2026", confirmPassword: "Bonjour2026", acceptTerms: "on" }).success).toBe(true);
    expect(registerStepSchemas[2].safeParse({ password: "Bonjour2026", confirmPassword: "Bonjour2027", acceptTerms: "on" }).success).toBe(false);
  });

  it("exige l'acceptation des conditions et des mots de passe identiques", () => {
    const res = registerSchema.safeParse({
      role: "PARENT",
      npi: "1234567890",
      firstName: "A",
      lastName: "B",
      email: "a@b.bj",
      phone: "0197000000",
      password: "Bonjour2026",
      confirmPassword: "Bonjour2027",
    });
    expect(res.success).toBe(false);
  });

  it("refuse une séance saisie à l'avance", () => {
    const future = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    expect(lessonSchema.safeParse({ tutoringId: "x", date: future, slot: "S08_11", workDone: "Révisions" }).success).toBe(false);
  });

});

describe("référentiel scolaire", () => {
  const curriculum: Curriculum = {
    classes: [
      { name: "Tle G2", cycle: "Secondaire 2", active: true, subjects: ["fiscalite", "droit"] },
      { name: "1ère C", cycle: "Secondaire 2", active: false, subjects: ["pct"] },
    ],
    subjects: [
      { key: "fiscalite", label: "Fiscalité", active: true },
      { key: "droit", label: "Droit", active: true },
      { key: "pct", label: "PCT", active: false },
    ],
  };

  it("donne les matières d'une classe, et aucune pour une classe inconnue", () => {
    expect(subjectsForClass(curriculum, "Tle G2")).toEqual(["fiscalite", "droit"]);
    expect(subjectsForClass(curriculum, "inconnue")).toEqual([]);
  });

  it("ne propose que les classes et matières actives", () => {
    expect(activeClasses(curriculum)).toEqual(["Tle G2"]);
    expect(activeSubjects(curriculum).map((s) => s.key)).toEqual(["fiscalite", "droit"]);
  });

  it("affiche la clé d'une matière inconnue plutôt que rien", () => {
    expect(subjectLabel(curriculum, "pct")).toBe("PCT");
    expect(subjectLabel(curriculum, "latin")).toBe("latin");
  });

  it("lit une case « active » décochée (champ absent) comme false", () => {
    expect(classLevelSchema.safeParse({ name: "Tle F4", cycle: "Secondaire 2", subjects: [] }).data?.active).toBe(false);
    expect(classLevelSchema.safeParse({ name: "Tle F4", cycle: "Secondaire 2", active: "on", subjects: [] }).data?.active).toBe(true);
    expect(subjectSchema.safeParse({ label: "Informatique" }).success).toBe(true);
  });

  it("dérive une clé stable du nom d'une nouvelle matière", () => {
    expect(subjectKeyFromLabel("Mathématiques financières")).toBe("mathematiques-financieres");
    expect(subjectKeyFromLabel("  Économie & Gestion ")).toBe("economie-gestion");
  });
});
