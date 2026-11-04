-- Sessions « Rester connecté » décoché : cookie de session, expiration courte.
ALTER TABLE "Session" ADD COLUMN "persistent" BOOLEAN NOT NULL DEFAULT true;
