-- Opérateur Mobile Money choisi par l'éducateur pour ses reversements (vide : opérateur par défaut du serveur).
CREATE TYPE "MobileOperator" AS ENUM ('MTN', 'MOOV');

ALTER TABLE "EducatorProfile" ADD COLUMN "payoutOperator" "MobileOperator";
