-- Le verrouillage global du compte est remplacé par une vérification anti-robot et un blocage par couple compte + adresse IP.
ALTER TABLE "User" DROP COLUMN "failedLogins",
DROP COLUMN "lockedUntil";
