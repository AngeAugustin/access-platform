// Verrouillage du compte après une série d'échecs de connexion.
// Le verrou expire seul au bout de 24 h ; avant, seul un administrateur peut le lever
// (une réinitialisation du mot de passe par l'utilisateur ne le lève pas).
export const LOCK_AFTER_FAILURES = 5;
export const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export function isLocked(lockedUntil: Date | null | undefined, now = new Date()): boolean {
  return !!lockedUntil && lockedUntil > now;
}

export function lockExpiry(now = new Date()): Date {
  return new Date(now.getTime() + LOCK_DURATION_MS);
}
