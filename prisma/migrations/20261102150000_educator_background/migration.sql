-- Parcours détaillé des éducateurs
ALTER TABLE "EducatorProfile" ADD COLUMN "degreeLevel" TEXT,
ADD COLUMN "degreeField" TEXT,
ADD COLUMN "degreeSchool" TEXT,
ADD COLUMN "degreeYear" INTEGER,
ADD COLUMN "occupation" TEXT,
ADD COLUMN "occupationPlace" TEXT,
ADD COLUMN "experiences" JSONB,
ADD COLUMN "achievements" TEXT;
