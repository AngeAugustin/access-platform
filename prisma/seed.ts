// Initialisation de la base : super-administrateur, grille tarifaire, paramètres.
// Données de démonstration (parent, éducateur, enfant) avec SEED_DEMO=1, jamais en production.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { CLASS_LEVELS, DEFAULT_SETTINGS } from "../src/lib/constants";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const hashPassword = (p: string) => hash(p, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

// Tarifs d'EXEMPLE à remplacer par la grille réelle d'Access depuis l'écran « Tarifs ».
function exampleRate(classLevel: string) {
  if (classLevel.startsWith("Tle")) return 2000;
  if (classLevel.startsWith("1ère") || classLevel.startsWith("2nde")) return 1500;
  return 1000;
}

async function main() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: {} });
  }
  for (const classLevel of CLASS_LEVELS) {
    await db.tariff.upsert({
      where: { classLevel },
      create: { classLevel, hourlyRate: exampleRate(classLevel), sessionsPerWeek: 2, hoursPerSession: 2 },
      update: {},
    });
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@access.local").toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    const password = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
    await db.user.create({
      data: {
        email,
        npi: process.env.SEED_ADMIN_NPI ?? "0000000000",
        phone: process.env.SEED_ADMIN_PHONE ?? "0100000000",
        firstName: "Super",
        lastName: "Admin",
        role: "ADMIN",
        isSuperAdmin: true,
        passwordHash: await hashPassword(password),
      },
    });
    console.log(`Super-administrateur créé : ${email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) console.log(`Mot de passe provisoire (à changer dès la première connexion) : ${password}`);
  }

  if (process.env.SEED_DEMO === "1") {
    if (process.env.NODE_ENV === "production") throw new Error("SEED_DEMO est interdit en production.");
    const demoPassword = await hashPassword("Demo12345678");
    const parent = await db.user.upsert({
      where: { email: "parent@demo.local" },
      update: {},
      create: { email: "parent@demo.local", npi: "1111111111", phone: "0161000001", firstName: "Awa", lastName: "Houngbo", city: "Cotonou", role: "PARENT", passwordHash: demoPassword },
    });
    const educatorUser = await db.user.upsert({
      where: { email: "educateur@demo.local" },
      update: {},
      create: { email: "educateur@demo.local", npi: "2222222222", phone: "0161000002", firstName: "Koffi", lastName: "Dossou", city: "Cotonou", role: "EDUCATOR", passwordHash: demoPassword },
    });
    const profile = await db.educatorProfile.upsert({
      where: { userId: educatorUser.id },
      update: {},
      create: {
        userId: educatorUser.id,
        birthDate: new Date("1994-03-12"),
        maritalStatus: "Célibataire",
        experienceYears: 5,
        background: "Licence de mathématiques (UAC). Cinq ans de cours de soutien en collège et lycée.",
        bio: "Patient et méthodique, j'aide les élèves à reprendre confiance en mathématiques et en PCT.",
        subjects: ["mathematiques", "pct", "svt"],
        classLevels: ["3ème ML", "3ème MC", "2nde CD", "1ère C", "1ère D", "Tle C", "Tle D"],
        zone: "Cotonou, Fidjrossè",
        guarantor1Name: "Paul Agossou",
        guarantor1Address: "Cotonou",
        guarantor1Phone: "0161000010",
        guarantor2Name: "Rita Zinsou",
        guarantor2Address: "Abomey-Calavi",
        guarantor2Phone: "0161000011",
        payoutPhone: "0161000002",
        status: "VALIDATED",
        level: "Cycle II",
        stars: 4,
        validatedAt: new Date(),
        availabilities: {
          create: [
            { day: "MONDAY", slot: "S17_20" },
            { day: "WEDNESDAY", slot: "S14_17" },
            { day: "SATURDAY", slot: "S08_11" },
          ],
        },
      },
    });
    const child = await db.child.findFirst({ where: { parentId: parent.id } });
    if (!child) {
      await db.child.create({
        data: {
          parentId: parent.id,
          firstName: "Malik",
          lastName: "Houngbo",
          sex: "M",
          birthDate: new Date("2010-09-01"),
          currentClass: "2nde CD",
          currentSchool: "CEG Le Nokoué",
          subjectLevels: {
            create: ["francais", "anglais", "pct", "svt", "histgeo", "philosophie", "mathematiques"].map((subject) => ({ subject, level: "AVERAGE" as const })),
          },
        },
      });
    }
    console.log(`Démo : parent@demo.local / educateur@demo.local (mot de passe Demo12345678), éducateur ${profile.id}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
