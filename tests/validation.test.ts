import { describe, expect, it } from "vitest";
import { lessonSchema, passwordSchema, phoneSchema, registerSchema } from "@/lib/validation";
import { subjectsForClass } from "@/lib/constants";

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

  it("associe les bonnes matières à chaque série", () => {
    expect(subjectsForClass("Tle G2")).toContain("fiscalite");
    expect(subjectsForClass("1ère C")).toContain("pct");
    expect(subjectsForClass("inconnue")).toEqual([]);
  });
});
