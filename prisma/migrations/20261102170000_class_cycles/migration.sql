-- Cycles scolaires (Primaire, Secondaire 1, Secondaire 2) et classes du primaire.

ALTER TABLE "ClassLevel" ADD COLUMN "cycle" TEXT NOT NULL DEFAULT 'Secondaire 1';
UPDATE "ClassLevel" SET "cycle" = 'Secondaire 2' WHERE "name" ~ '^(2nde|1ère|Tle)';

-- Le primaire passe en tête de liste.
UPDATE "ClassLevel" SET "position" = "position" + 6;
INSERT INTO "ClassLevel" ("id", "name", "position", "cycle", "updatedAt")
SELECT gen_random_uuid()::text, v.name, v.position, 'Primaire', CURRENT_TIMESTAMP
FROM (VALUES ('CI', 1), ('CP', 2), ('CE1', 3), ('CE2', 4), ('CM1', 5), ('CM2', 6)) AS v(name, position)
WHERE NOT EXISTS (SELECT 1 FROM "ClassLevel" c WHERE c."name" = v.name);

-- Matières propres au primaire.
INSERT INTO "Subject" ("id", "key", "label", "position", "updatedAt")
SELECT gen_random_uuid()::text, v.key, v.label, (SELECT COALESCE(MAX("position"), 0) FROM "Subject") + v.rank, CURRENT_TIMESTAMP
FROM (VALUES ('est', 'Éducation scientifique et technologique', 1), ('es', 'Éducation sociale', 2)) AS v(key, label, rank)
WHERE NOT EXISTS (SELECT 1 FROM "Subject" s WHERE s."key" = v.key);

INSERT INTO "ClassLevelSubject" ("classLevelId", "subjectId")
SELECT c."id", s."id"
FROM "ClassLevel" c, "Subject" s
WHERE c."cycle" = 'Primaire' AND s."key" IN ('francais', 'mathematiques', 'est', 'es')
ON CONFLICT DO NOTHING;

-- Tarif de départ du primaire : le plus bas de la grille actuelle, à ajuster depuis « Tarifs ».
INSERT INTO "Tariff" ("id", "classLevel", "hourlyRate", "sessionsPerWeek", "hoursPerSession", "updatedAt")
SELECT gen_random_uuid()::text, c."name", t."hourlyRate", t."sessionsPerWeek", t."hoursPerSession", CURRENT_TIMESTAMP
FROM "ClassLevel" c
CROSS JOIN (SELECT "hourlyRate", "sessionsPerWeek", "hoursPerSession" FROM "Tariff" ORDER BY "hourlyRate" ASC LIMIT 1) t
WHERE c."cycle" = 'Primaire' AND NOT EXISTS (SELECT 1 FROM "Tariff" x WHERE x."classLevel" = c."name");

-- Cycles où intervient chaque éducateur, déduits de ses classes ; l'administrateur peut les corriger.
ALTER TABLE "EducatorProfile" ADD COLUMN "cycles" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "EducatorProfile" p SET "cycles" = COALESCE((
  SELECT array_agg(DISTINCT c."cycle" ORDER BY c."cycle")
  FROM "ClassLevel" c WHERE c."name" = ANY(p."classLevels")
), ARRAY[]::TEXT[]);
