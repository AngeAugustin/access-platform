import { describe, expect, it } from "vitest";
import { checkSolution, issueChallenge, leadingZeroBits, solveSync } from "@/lib/pow-core";

const SECRET = "secret-de-test-secret-de-test-secret";

describe("preuve de travail", () => {
  it("compte les bits à zéro en tête", () => {
    expect(leadingZeroBits(Buffer.from([0x00, 0x0f]))).toBe(12);
    expect(leadingZeroBits(Buffer.from([0x80]))).toBe(0);
    expect(leadingZeroBits(Buffer.from([0x00, 0x00, 0x01]))).toBe(23);
  });

  const c = issueChallenge("login", 10, SECRET);
  const nonce = solveSync(c.salt, 10);
  const solution = `${c.token}~${nonce}`;

  it("accepte une solution correcte", () => {
    expect(checkSolution(solution, "login", 10, SECRET).ok).toBe(true);
  });

  it("refuse une solution pour un autre usage", () => {
    expect(checkSolution(solution, "register", 10, SECRET)).toEqual({ ok: false, reason: "objet" });
  });

  it("refuse un défi plus facile que la difficulté exigée", () => {
    expect(checkSolution(solution, "login", 16, SECRET)).toEqual({ ok: false, reason: "difficulté" });
  });

  it("refuse un défi signé avec une autre clé ou modifié", () => {
    expect(checkSolution(solution, "login", 10, "autre-secret-autre-secret-autre-secret")).toEqual({ ok: false, reason: "signature" });
    const [data, sig] = c.token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(data, "base64url").toString()), b: 1 })).toString("base64url");
    expect(checkSolution(`${forged}.${sig}~0`, "login", 1, SECRET)).toEqual({ ok: false, reason: "signature" });
  });

  it("refuse un nombre qui ne résout pas le défi", () => {
    let wrong = nonce + 1;
    while (checkSolution(`${c.token}~${wrong}`, "login", 10, SECRET).ok) wrong++;
    expect(checkSolution(`${c.token}~${wrong}`, "login", 10, SECRET)).toEqual({ ok: false, reason: "calcul" });
  });

  it("refuse un défi expiré", () => {
    const old = issueChallenge("login", 8, SECRET, 1000, Date.now() - 5000);
    expect(checkSolution(`${old.token}~${solveSync(old.salt, 8)}`, "login", 8, SECRET)).toEqual({ ok: false, reason: "expirée" });
  });

  it("refuse les entrées absentes ou malformées", () => {
    expect(checkSolution(null, "login", 10, SECRET).ok).toBe(false);
    expect(checkSolution("x".repeat(1000), "login", 10, SECRET).ok).toBe(false);
    expect(checkSolution(`${c.token}~abc`, "login", 10, SECRET).ok).toBe(false);
  });
});
