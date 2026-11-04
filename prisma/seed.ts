// Initialisation de la base : super-administrateur, grille tarifaire, paramètres.
// Données de démonstration (parent, éducateur, deux enfants, un tutorat en cours) avec SEED_DEMO=1, jamais en production.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_SETTINGS } from "../src/lib/constants";
import { addWeeks, planInstallments, splitCommission } from "../src/lib/billing";
import { installmentReference, tutoringReference } from "../src/lib/ids";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DAY_MS = 24 * 60 * 60 * 1000;
const hashPassword = (p: string) => hash(p, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

// Tarifs d'EXEMPLE à remplacer par la grille réelle d'Access depuis l'écran « Tarifs ».
function exampleRate(classLevel: string) {
  if (classLevel.startsWith("Tle")) return 2000;
  if (classLevel.startsWith("1ère") || classLevel.startsWith("2nde")) return 1500;
  return 1000;
}

// Comptes de démo (développement uniquement) : admin@, parent@ et educateur@access.local, mot de passe DEMO_PASSWORD.
const DEMO = process.env.SEED_DEMO === "1";
const DEMO_PASSWORD = "password";

async function main() {
  if (DEMO && process.env.NODE_ENV === "production") throw new Error("SEED_DEMO est interdit en production.");
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: {} });
  }
  // Les classes et matières elles-mêmes sont créées par la migration « curriculum ».
  const classes = await db.classLevel.findMany({ where: { active: true }, select: { name: true } });
  for (const { name: classLevel } of classes) {
    await db.tariff.upsert({
      where: { classLevel },
      create: { classLevel, hourlyRate: exampleRate(classLevel), sessionsPerWeek: 2, hoursPerSession: 2 },
      update: {},
    });
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@access.local").toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    const password = process.env.SEED_ADMIN_PASSWORD ?? (DEMO ? DEMO_PASSWORD : randomBytes(12).toString("base64url"));
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
        mustChangePassword: !process.env.SEED_ADMIN_PASSWORD && !DEMO,
      },
    });
    console.log(`Super-administrateur créé : ${email}`);
    if (!process.env.SEED_ADMIN_PASSWORD && !DEMO) console.log(`Mot de passe provisoire (à changer dès la première connexion) : ${password}`);
  }

  if (DEMO) {
    // Relancer le seed remet le mot de passe des comptes de démo à DEMO_PASSWORD.
    const demoPassword = await hashPassword(DEMO_PASSWORD);
    // Anciens comptes de démo en @demo.local : renommés plutôt que dupliqués (NPI unique).
    for (const name of ["parent", "educateur"]) {
      if (!(await db.user.findUnique({ where: { email: `${name}@access.local` } }))) {
        await db.user.updateMany({ where: { email: `${name}@demo.local` }, data: { email: `${name}@access.local` } });
      }
    }
    await db.user.upsert({
      where: { email: "admin@access.local" },
      update: { passwordHash: demoPassword },
      create: { email: "admin@access.local", npi: "3333333333", phone: "0161000003", firstName: "Super", lastName: "Admin", role: "ADMIN", isSuperAdmin: true, passwordHash: demoPassword },
    });
    const parent = await db.user.upsert({
      where: { email: "parent@access.local" },
      update: { passwordHash: demoPassword },
      create: { email: "parent@access.local", npi: "1111111111", phone: "0161000001", firstName: "Awa", lastName: "Houngbo", city: "Cotonou", role: "PARENT", passwordHash: demoPassword },
    });
    const educatorUser = await db.user.upsert({
      where: { email: "educateur@access.local" },
      update: { passwordHash: demoPassword },
      create: { email: "educateur@access.local", npi: "2222222222", phone: "0161000002", firstName: "Koffi", lastName: "Dossou", city: "Cotonou", role: "EDUCATOR", passwordHash: demoPassword },
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
        zone: "Fidjrossè (Cotonou)",
        guarantor1Name: "Paul Agossou",
        guarantor1Address: "Cotonou",
        guarantor1Phone: "0161000010",
        guarantor2Name: "Rita Zinsou",
        guarantor2Address: "Abomey-Calavi",
        guarantor2Phone: "0161000011",
        payoutPhone: "0161000002",
        status: "VALIDATED",
        cycles: ["Secondaire 1", "Secondaire 2"],
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
    if ((await db.child.count({ where: { parentId: parent.id } })) < 2) {
      await db.child.create({
        data: {
          parentId: parent.id,
          firstName: "Sènan",
          lastName: "Houngbo",
          sex: "F",
          birthDate: new Date("2014-02-14"),
          currentClass: "5ème",
          currentSchool: "Collège Père Aupiais",
          interests: "lecture, musique",
          subjectLevels: {
            create: [
              { subject: "francais", level: "WEAK" as const },
              { subject: "anglais", level: "AVERAGE" as const },
              { subject: "mathematiques", level: "GOOD" as const },
              { subject: "svt", level: "VERY_GOOD" as const },
            ],
          },
        },
      });
    }
    await seedDemoTutoring(parent.id, profile.id);
    await seedDemoCommunity(demoPassword);
    console.log(`Démo : admin@access.local / parent@access.local / educateur@access.local (mot de passe ${DEMO_PASSWORD}), éducateur ${profile.id}`);
  }
}

// Tutorat de démo en cours (Malik avec Koffi, lundi et samedi) : séances confirmées et à confirmer,
// une échéance payée et la suivante en attente. Créé une seule fois.
async function seedDemoTutoring(parentId: string, educatorId: string) {
  if (await db.tutoring.findFirst({ where: { parentId } })) return;
  const child = await db.child.findFirst({ where: { parentId, firstName: "Malik" } });
  const tariff = child && (await db.tariff.findUnique({ where: { classLevel: child.currentClass } }));
  if (!child || !tariff) return;
  const setting = async (key: keyof typeof DEFAULT_SETTINGS) => Number((await db.setting.findUnique({ where: { key } }))?.value ?? DEFAULT_SETTINGS[key]);
  const weeksPerInstallment = await setting("weeksPerInstallment");
  const commissionPercent = await setting("commissionPercent");

  const durationWeeks = 12;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startDate = new Date(today - 5 * 7 * DAY_MS);
  const slots = [
    { day: "MONDAY" as const, weekday: 1, slot: "S17_20" as const, label: "Lundi 17h-20h", endHour: 20 },
    { day: "SATURDAY" as const, weekday: 6, slot: "S08_11" as const, label: "Samedi 08h-11h", endHour: 11 },
  ];
  const plan = planInstallments(tariff, durationWeeks, startDate, weeksPerInstallment);

  const tutoring = await db.tutoring.create({
    data: {
      reference: tutoringReference(),
      parentId,
      educatorId,
      childId: child.id,
      durationWeeks,
      startDate,
      endDate: addWeeks(startDate, durationWeeks),
      classLevel: child.currentClass,
      hourlyRate: tariff.hourlyRate,
      sessionsPerWeek: tariff.sessionsPerWeek,
      hoursPerSession: tariff.hoursPerSession,
      slotsLabel: slots.map((s) => s.label).join(", "),
      bookedSlots: { create: slots.map((s) => ({ educatorId, day: s.day, slot: s.slot })) },
      installments: { create: plan.map((p) => ({ index: p.index, weeks: p.weeks, amount: p.amount, dueDate: p.dueDate, reference: installmentReference() })) },
    },
    include: { installments: { orderBy: { index: "asc" } } },
  });

  // Séances passées (fin du créneau dépassée, heure du Bénin = UTC+1) : les deux dernières restent à confirmer.
  const topics = [
    ["Polynômes : factorisation et identités remarquables.", "Bonne participation."],
    ["Électricité : loi d'Ohm, exercices d'application.", null],
    ["Équations du premier degré, mise en équation de problèmes.", "Doit relire le cours avant la séance."],
    ["Fonctions affines : représentation graphique.", null],
    ["Cinématique : vitesse moyenne, unités et conversions.", "Progrès nets sur les conversions."],
    ["Équations du second degré : discriminant, six exercices corrigés ensemble.", "Deux exercices à rendre pour la prochaine séance."],
  ] as const;
  const lessons: { date: Date; slot: (typeof slots)[number]["slot"] }[] = [];
  for (let day = startDate.getTime(); day <= today; day += DAY_MS) {
    for (const s of slots) {
      if (new Date(day).getUTCDay() === s.weekday && day + (s.endHour - 1) * 3600_000 <= now.getTime()) lessons.push({ date: new Date(day), slot: s.slot });
    }
  }
  await db.lesson.createMany({
    data: lessons.map((l, i) => {
      const [workDone, observation] = topics[i % topics.length];
      const recorded = i >= lessons.length - 2;
      return { tutoringId: tutoring.id, date: l.date, slot: l.slot, workDone, observation, status: recorded ? "RECORDED" : "CONFIRMED", confirmedAt: recorded ? null : new Date(l.date.getTime() + DAY_MS) };
    }),
  });

  // Échéances déjà exigibles : payées par Mobile Money, avec leur reversement à l'éducateur.
  for (const inst of tutoring.installments.filter((i) => i.dueDate <= now)) {
    const paidAt = new Date(inst.dueDate.getTime() - 2 * DAY_MS);
    await db.installment.update({ where: { id: inst.id }, data: { status: "PAID", paidAt } });
    await db.payment.create({ data: { installmentId: inst.id, payerId: parentId, amount: inst.amount, providerTransactionId: `DEMO-${inst.reference}`, status: "APPROVED", approvedAt: paidAt } });
    await db.payout.create({ data: { installmentId: inst.id, educatorId, ...splitCommission(inst.amount, commissionPercent) } });
  }
}

type Day = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
type Slot = "S08_11" | "S11_14" | "S14_17" | "S17_20";
type Level = "WEAK" | "AVERAGE" | "GOOD" | "VERY_GOOD";

// Cycles déduits des classes : 2nde, 1ère et Tle relèvent du Secondaire 2.
const cyclesOf = (classLevels: string[]) => [
  ...new Set(classLevels.map((c) => (/^(2nde|1ère|Tle)/.test(c) ? "Secondaire 2" : "Secondaire 1"))),
].sort();

// « Fidjrossè (Cotonou) » → « Cotonou ».
const communeOf = (zone: string) => zone.replace(/^.*\((.+)\)$/, "$1");

const DEMO_EDUCATORS: {
  firstName: string;
  lastName: string;
  experienceYears: number;
  subjects: string[];
  classLevels: string[];
  zone: string;
  level?: string;
  stars: number;
  bio: string;
  background: string;
  slots: [Day, Slot][];
}[] = [
  { firstName: "Afiavi", lastName: "Hounkpè", experienceYears: 7, subjects: ["francais", "anglais"], classLevels: ["6ème", "5ème", "4ème ML", "4ème MC", "3ème ML", "3ème MC", "2nde AB"], zone: "Cadjèhoun (Cotonou)", level: "Cycle III", stars: 5, bio: "J'aide les élèves à prendre plaisir à lire et à écrire, avec des méthodes simples pour la dissertation et le commentaire.", background: "Licence de lettres modernes (UAC). Professeure de français en collège privé depuis 2019.", slots: [["TUESDAY", "S17_20"], ["THURSDAY", "S17_20"], ["SATURDAY", "S08_11"]] },
  { firstName: "Rodrigue", lastName: "Sossa", experienceYears: 4, subjects: ["mathematiques", "svt"], classLevels: ["3ème ML", "3ème MC", "2nde CD", "1ère D", "Tle D"], zone: "Akpakpa (Cotonou)", level: "Cycle II", stars: 4, bio: "Rigoureux et à l'écoute, je reprends les bases avant d'avancer et je donne des exercices ciblés entre les séances.", background: "Master de biologie (UAC). Répétiteur à domicile depuis quatre ans.", slots: [["MONDAY", "S14_17"], ["WEDNESDAY", "S14_17"], ["SATURDAY", "S11_14"]] },
  { firstName: "Grâce", lastName: "Mensah", experienceYears: 3, subjects: ["pct", "mathematiques"], classLevels: ["5ème", "4ème ML", "4ème MC", "3ème ML", "3ème MC", "2nde CD", "1ère C"], zone: "Godomey (Abomey-Calavi)", level: "Cycle I", stars: 4, bio: "Je rends la physique concrète avec des expériences simples et beaucoup de schémas.", background: "Licence de physique-chimie (UAC). Monitrice de travaux pratiques à l'université.", slots: [["TUESDAY", "S14_17"], ["FRIDAY", "S17_20"], ["SUNDAY", "S08_11"]] },
  { firstName: "Jean-Baptiste", lastName: "Agbodjan", experienceYears: 12, subjects: ["mathematiques", "pct"], classLevels: ["1ère C", "1ère D", "Tle C", "Tle D"], zone: "Gbégamey (Cotonou)", level: "Cycle III", stars: 5, bio: "Spécialiste de la préparation au baccalauréat C et D : méthode, sujets types et gestion du temps.", background: "Ingénieur (EPAC), professeur certifié de mathématiques. Douze ans d'enseignement en lycée.", slots: [["MONDAY", "S17_20"], ["WEDNESDAY", "S17_20"], ["SATURDAY", "S14_17"]] },
  { firstName: "Clarisse", lastName: "Dègbo", experienceYears: 5, subjects: ["anglais", "espagnol"], classLevels: ["6ème", "5ème", "4ème ML", "3ème ML", "2nde AB", "1ère AB", "Tle AB"], zone: "Fidjrossè (Cotonou)", level: "Cycle II", stars: 4, bio: "Conversation, vocabulaire et grammaire : je fais parler les élèves dès la première séance.", background: "Licence d'anglais (UAC), séjour linguistique au Ghana. Cinq ans de cours particuliers.", slots: [["WEDNESDAY", "S11_14"], ["THURSDAY", "S14_17"], ["SATURDAY", "S08_11"], ["SUNDAY", "S14_17"]] },
  { firstName: "Ulrich", lastName: "Tossou", experienceYears: 2, subjects: ["histgeo", "philosophie"], classLevels: ["2nde AB", "1ère AB", "Tle AB", "Tle D"], zone: "Ouando (Porto-Novo)", level: "Cycle I", stars: 3, bio: "J'apprends aux élèves à construire un raisonnement et à rédiger une dissertation claire.", background: "Master de philosophie (UAC). Premier poste d'enseignant vacataire.", slots: [["MONDAY", "S14_17"], ["FRIDAY", "S14_17"]] },
  { firstName: "Nadège", lastName: "Kpadonou", experienceYears: 9, subjects: ["comptabilite", "economie", "mathsfinancieres"], classLevels: ["2nde G2", "1ère G2", "Tle G2"], zone: "Zogbo (Cotonou)", level: "Cycle III", stars: 5, bio: "Comptabilité et mathématiques financières sans stress : des exercices progressifs jusqu'au niveau du bac G2.", background: "Expert-comptable stagiaire, licence de sciences de gestion (FASEG). Neuf ans de répétition.", slots: [["TUESDAY", "S17_20"], ["SATURDAY", "S11_14"], ["SUNDAY", "S11_14"]] },
  { firstName: "Serge", lastName: "Ahouansou", experienceYears: 6, subjects: ["svt", "pct"], classLevels: ["4ème ML", "4ème MC", "3ème ML", "3ème MC", "2nde CD", "1ère D"], zone: "Zogbadjè (Abomey-Calavi)", level: "Cycle II", stars: 4, bio: "Fiches de révision, schémas et questions types : j'aide les élèves à retenir durablement.", background: "Licence de biologie-géologie (UAC). Six ans d'encadrement en collège.", slots: [["MONDAY", "S17_20"], ["THURSDAY", "S17_20"], ["SATURDAY", "S14_17"]] },
  { firstName: "Mireille", lastName: "Gbaguidi", experienceYears: 8, subjects: ["francais", "histgeo"], classLevels: ["6ème", "5ème", "4ème ML", "4ème MC", "3ème ML", "3ème MC"], zone: "Agla (Cotonou)", level: "Cycle II", stars: 5, bio: "Patiente avec les plus jeunes, je travaille la lecture, l'orthographe et la méthode en histoire-géographie.", background: "Institutrice de formation, licence d'histoire (UAC). Huit ans au collège.", slots: [["WEDNESDAY", "S14_17"], ["FRIDAY", "S17_20"], ["SATURDAY", "S08_11"]] },
  { firstName: "Hervé", lastName: "Zannou", experienceYears: 3, subjects: ["mathematiques", "allemand"], classLevels: ["6ème", "5ème", "4ème ML", "3ème ML", "2nde AB"], zone: "Vèdoko (Cotonou)", level: "Cycle I", stars: 4, bio: "Je reprends les bases du calcul pas à pas et j'initie à l'allemand avec des supports ludiques.", background: "Licence de mathématiques (UAC), séjour d'études en Allemagne. Trois ans de répétition.", slots: [["TUESDAY", "S14_17"], ["THURSDAY", "S14_17"], ["SUNDAY", "S08_11"]] },
];

const DEMO_PARENTS: {
  firstName: string;
  lastName: string;
  city: string;
  address: string;
  children: { firstName: string; sex: "M" | "F"; birthDate: string; currentClass: string; currentSchool: string; interests?: string; levels: [string, Level][] }[];
}[] = [
  {
    firstName: "Aïcha",
    lastName: "Adjovi",
    city: "Cotonou",
    address: "Fidjrossè, rue 12.345",
    children: [
      { firstName: "Yannick", sex: "M", birthDate: "2008-05-17", currentClass: "Tle D", currentSchool: "Lycée Coulibaly", interests: "basket, sciences", levels: [["mathematiques", "AVERAGE"], ["pct", "WEAK"], ["svt", "GOOD"], ["francais", "AVERAGE"], ["philosophie", "AVERAGE"], ["anglais", "GOOD"], ["histgeo", "GOOD"]] },
      { firstName: "Ornella", sex: "F", birthDate: "2013-11-03", currentClass: "6ème", currentSchool: "CEG Les Pylônes", interests: "danse, dessin", levels: [["francais", "GOOD"], ["mathematiques", "WEAK"], ["anglais", "AVERAGE"], ["svt", "GOOD"], ["histgeo", "AVERAGE"]] },
    ],
  },
  {
    firstName: "Désiré",
    lastName: "Kiki",
    city: "Abomey-Calavi",
    address: "Godomey, carrefour Togoudo",
    children: [
      { firstName: "Bénédicte", sex: "F", birthDate: "2010-02-28", currentClass: "3ème MC", currentSchool: "CEG Godomey", interests: "lecture, chant", levels: [["francais", "VERY_GOOD"], ["mathematiques", "AVERAGE"], ["pct", "AVERAGE"], ["anglais", "GOOD"], ["svt", "GOOD"], ["histgeo", "VERY_GOOD"]] },
      { firstName: "Fabrice", sex: "M", birthDate: "2009-08-09", currentClass: "1ère G2", currentSchool: "Lycée technique Coulibaly", interests: "football, jeux de stratégie", levels: [["comptabilite", "WEAK"], ["economie", "AVERAGE"], ["mathsfinancieres", "WEAK"], ["francais", "AVERAGE"], ["anglais", "AVERAGE"]] },
    ],
  },
];

// Catalogue de démo : dix éducateurs validés et deux familles de deux enfants. Comptes en prénom.nom@access.local.
async function seedDemoCommunity(passwordHash: string) {
  const email = (first: string, last: string) =>
    `${first}.${last}@access.local`
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  for (const [i, e] of DEMO_EDUCATORS.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const user = await db.user.upsert({
      where: { email: email(e.firstName, e.lastName) },
      update: { passwordHash },
      create: { email: email(e.firstName, e.lastName), npi: `40000000${n}`, phone: `01620000${n}`, firstName: e.firstName, lastName: e.lastName, city: communeOf(e.zone), role: "EDUCATOR", passwordHash },
    });
    await db.educatorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        birthDate: new Date(Date.UTC(2001 - e.experienceYears, i % 12, 10 + i)),
        maritalStatus: i % 3 === 0 ? "Marié(e)" : "Célibataire",
        experienceYears: e.experienceYears,
        background: e.background,
        bio: e.bio,
        subjects: e.subjects,
        classLevels: e.classLevels,
        zone: e.zone,
        guarantor1Name: `Garant ${e.lastName}`,
        guarantor1Address: communeOf(e.zone),
        guarantor1Phone: `01640000${n}`,
        guarantor2Name: `Tuteur ${e.lastName}`,
        guarantor2Address: communeOf(e.zone),
        guarantor2Phone: `01650000${n}`,
        payoutPhone: `01620000${n}`,
        status: "VALIDATED",
        cycles: cyclesOf(e.classLevels),
        stars: e.stars,
        submittedAt: new Date(),
        validatedAt: new Date(),
        availabilities: { create: e.slots.map(([day, slot]) => ({ day, slot })) },
      },
    });
  }

  for (const [i, p] of DEMO_PARENTS.entries()) {
    const parent = await db.user.upsert({
      where: { email: email(p.firstName, p.lastName) },
      update: { passwordHash },
      create: { email: email(p.firstName, p.lastName), npi: `500000000${i + 1}`, phone: `016300000${i + 1}`, firstName: p.firstName, lastName: p.lastName, city: p.city, address: p.address, role: "PARENT", acceptedTermsAt: new Date(), passwordHash },
    });
    if (await db.child.count({ where: { parentId: parent.id } })) continue;
    for (const c of p.children) {
      await db.child.create({
        data: {
          parentId: parent.id,
          firstName: c.firstName,
          lastName: p.lastName,
          sex: c.sex,
          birthDate: new Date(c.birthDate),
          currentClass: c.currentClass,
          currentSchool: c.currentSchool,
          interests: c.interests,
          subjectLevels: { create: c.levels.map(([subject, level]) => ({ subject, level })) },
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
