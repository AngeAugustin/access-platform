-- Verrouillage du compte après 5 échecs de connexion consécutifs, désactivation et mot de passe provisoire.
ALTER TYPE "AccountStatus" ADD VALUE 'DEACTIVATED';

ALTER TABLE "User" ADD COLUMN "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lockedUntil" TIMESTAMP(3),
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
