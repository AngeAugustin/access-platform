-- Matières complémentaires du primaire.
INSERT INTO "Subject" ("id", "key", "label", "position", "updatedAt")
SELECT gen_random_uuid()::text, v.key, v.label, (SELECT COALESCE(MAX("position"), 0) FROM "Subject") + v.rank, CURRENT_TIMESTAMP
FROM (VALUES
  ('lecture', 'Lecture', 1),
  ('expression-ecrite', 'Expression écrite', 2),
  ('education-artistique', 'Éducation artistique', 3)
) AS v(key, label, rank)
WHERE NOT EXISTS (SELECT 1 FROM "Subject" s WHERE s."key" = v.key);

-- Toutes les classes du primaire : lecture, expression écrite, éducation artistique et anglais.
INSERT INTO "ClassLevelSubject" ("classLevelId", "subjectId")
SELECT c."id", s."id"
FROM "ClassLevel" c, "Subject" s
WHERE c."cycle" = 'Primaire' AND s."key" IN ('lecture', 'expression-ecrite', 'education-artistique', 'anglais')
ON CONFLICT DO NOTHING;
