import { describe, expect, it } from "vitest";
import { isLocked, LOCK_AFTER_FAILURES, LOCK_DURATION_MS, lockExpiry } from "@/lib/auth/lockout";
import { provisionalPassword } from "@/lib/ids";
import { passwordSchema } from "@/lib/validation";

describe("verrouillage du compte", () => {
  it("verrouille après 5 échecs pour 24 h", () => {
    expect(LOCK_AFTER_FAILURES).toBe(5);
    const now = new Date("2026-11-02T10:00:00Z");
    expect(lockExpiry(now).getTime() - now.getTime()).toBe(LOCK_DURATION_MS);
    expect(LOCK_DURATION_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("n'est verrouillé que tant que l'échéance n'est pas passée", () => {
    const now = new Date("2026-11-02T10:00:00Z");
    expect(isLocked(null, now)).toBe(false);
    expect(isLocked(new Date("2026-11-03T09:59:59Z"), now)).toBe(true);
    expect(isLocked(new Date("2026-11-02T10:00:00Z"), now)).toBe(false);
    expect(isLocked(new Date("2026-11-01T10:00:00Z"), now)).toBe(false);
  });
});

describe("mot de passe provisoire", () => {
  it("respecte les règles de mot de passe et change à chaque appel", () => {
    const a = provisionalPassword();
    expect(passwordSchema.safeParse(a).success).toBe(true);
    expect(a).not.toBe(provisionalPassword());
  });
});
