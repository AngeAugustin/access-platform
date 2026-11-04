-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevelSubject" (
    "classLevelId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "ClassLevelSubject_pkey" PRIMARY KEY ("classLevelId","subjectId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_name_key" ON "ClassLevel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_key_key" ON "Subject"("key");

-- CreateIndex
CREATE INDEX "ClassLevelSubject_subjectId_idx" ON "ClassLevelSubject"("subjectId");

-- AddForeignKey
ALTER TABLE "ClassLevelSubject" ADD CONSTRAINT "ClassLevelSubject_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevelSubject" ADD CONSTRAINT "ClassLevelSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Reprise du référentiel jusqu'ici codé en dur (src/lib/constants.ts).
-- ---------------------------------------------------------------------------

INSERT INTO "Subject" ("id", "key", "label", "position", "updatedAt")
SELECT gen_random_uuid()::text, v.key, v.label, v.position, CURRENT_TIMESTAMP
FROM (VALUES
  ('francais', 'Français', 1),
  ('anglais', 'Anglais', 2),
  ('allemand', 'Allemand', 3),
  ('espagnol', 'Espagnol', 4),
  ('philosophie', 'Philosophie', 5),
  ('mathematiques', 'Mathématiques', 6),
  ('svt', 'SVT', 7),
  ('pct', 'PCT', 8),
  ('histgeo', 'Histoire-Géographie', 9),
  ('economie', 'Économie', 10),
  ('comptabilite', 'Comptabilité', 11),
  ('comptagenerale', 'Comptabilité générale', 12),
  ('comptaanalytique', 'Comptabilité analytique', 13),
  ('comptasociete', 'Comptabilité des sociétés', 14),
  ('comptausuelle', 'Comptabilité usuelle', 15),
  ('ta', 'Techniques administratives', 16),
  ('mathsfinancieres', 'Mathématiques financières', 17),
  ('mathsgenerales', 'Mathématiques générales', 18),
  ('droit', 'Droit', 19),
  ('fiscalite', 'Fiscalité', 20)
) AS v(key, label, position);

INSERT INTO "ClassLevel" ("id", "name", "position", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.position, CURRENT_TIMESTAMP
FROM (VALUES
  ('6ème', 1), ('5ème', 2), ('4ème ML', 3), ('4ème MC', 4), ('3ème ML', 5), ('3ème MC', 6),
  ('2nde AB', 7), ('2nde CD', 8), ('2nde G2', 9),
  ('1ère AB', 10), ('1ère C', 11), ('1ère D', 12), ('1ère G2', 13),
  ('Tle AB', 14), ('Tle C', 15), ('Tle D', 16), ('Tle G2', 17)
) AS v(name, position);

-- Matières par classe : collège, séries AB et CD, puis G2 (règles de l'application d'origine).
INSERT INTO "ClassLevelSubject" ("classLevelId", "subjectId")
SELECT c."id", s."id"
FROM (
  SELECT cls, subj FROM unnest(ARRAY['6ème', '5ème', '4ème ML', '4ème MC', '3ème ML', '3ème MC']) AS cls,
    unnest(ARRAY['francais', 'mathematiques', 'anglais', 'svt', 'pct', 'histgeo', 'allemand', 'espagnol']) AS subj
  UNION ALL
  SELECT cls, subj FROM unnest(ARRAY['2nde AB', '1ère AB', 'Tle AB']) AS cls,
    unnest(ARRAY['francais', 'anglais', 'svt', 'philosophie', 'mathematiques', 'allemand', 'espagnol', 'histgeo']) AS subj
  UNION ALL
  SELECT cls, subj FROM unnest(ARRAY['2nde CD', '1ère C', '1ère D', 'Tle C', 'Tle D']) AS cls,
    unnest(ARRAY['francais', 'anglais', 'pct', 'svt', 'histgeo', 'philosophie', 'mathematiques']) AS subj
  UNION ALL
  SELECT '2nde G2', subj FROM unnest(ARRAY['francais', 'anglais', 'economie', 'comptabilite', 'ta', 'mathsfinancieres', 'droit', 'mathsgenerales']) AS subj
  UNION ALL
  SELECT '1ère G2', subj FROM unnest(ARRAY['anglais', 'francais', 'ta', 'comptagenerale', 'comptausuelle', 'mathsgenerales', 'mathsfinancieres', 'economie', 'droit']) AS subj
  UNION ALL
  SELECT 'Tle G2', subj FROM unnest(ARRAY['francais', 'anglais', 'droit', 'economie', 'comptasociete', 'comptaanalytique', 'fiscalite', 'mathsfinancieres', 'mathsgenerales', 'philosophie']) AS subj
) AS v
JOIN "ClassLevel" c ON c."name" = v.cls
JOIN "Subject" s ON s."key" = v.subj;

-- Valeurs déjà présentes dans les données mais absentes du référentiel (reprise de l'ancienne base) :
-- ajoutées telles quelles pour qu'aucun enfant, éducateur ou tarif ne pointe vers une valeur inconnue.
INSERT INTO "ClassLevel" ("id", "name", "position", "updatedAt")
SELECT gen_random_uuid()::text, u.name, 17 + row_number() OVER (ORDER BY u.name), CURRENT_TIMESTAMP
FROM (
  SELECT "currentClass" AS name FROM "Child"
  UNION SELECT "classLevel" FROM "Tariff"
  UNION SELECT unnest("classLevels") FROM "EducatorProfile"
) AS u
WHERE u.name <> '' AND NOT EXISTS (SELECT 1 FROM "ClassLevel" c WHERE c."name" = u.name);

INSERT INTO "Subject" ("id", "key", "label", "position", "updatedAt")
SELECT gen_random_uuid()::text, u.key, u.key, 20 + row_number() OVER (ORDER BY u.key), CURRENT_TIMESTAMP
FROM (
  SELECT "subject" AS key FROM "SubjectLevel"
  UNION SELECT unnest("subjects") FROM "EducatorProfile"
) AS u
WHERE u.key <> '' AND NOT EXISTS (SELECT 1 FROM "Subject" s WHERE s."key" = u.key);
