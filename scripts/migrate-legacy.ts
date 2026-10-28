// Migration des données de l'ancien backend Symfony (MySQL) vers la nouvelle base PostgreSQL.
//
//   LEGACY_MYSQL_URL="mysql://user:pass@host:3306/base" npm run migrate:legacy -- [--dry-run] [--force-reset]
//
// --dry-run      : lit et convertit tout, affiche le rapport, n'écrit rien.
// --force-reset  : n'importe pas les anciens mots de passe (stockés en clair dans l'ancienne base,
//                  donc à considérer comme exposés) ; chaque utilisateur passera par « Mot de passe oublié ».
//
// À lancer sur une base PostgreSQL vide (après `npm run db:migrate`), une seule fois.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import type { InstallmentStatus, LessonStatus, Role, SubjectLevelValue, TimeSlot, Weekday } from "../src/generated/prisma/client";
import { CLASS_LEVELS, DEFAULT_SETTINGS, subjectsForClass, type SubjectKey } from "../src/lib/constants";
import { addWeeks } from "../src/lib/billing";
import { storeBuffer } from "../src/server/services/storage";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE_RESET = process.argv.includes("--force-reset");

type Row = Record<string, unknown>;
const report: string[] = [];
const warn = (msg: string) => report.push(`⚠ ${msg}`);
const counts: Record<string, number> = {};
const count = (key: string) => (counts[key] = (counts[key] ?? 0) + 1);

const str = (v: unknown) => (v === null || v === undefined ? null : String(v).trim() || null);
const int = (v: unknown) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
const date = (v: unknown) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ROLE: Record<string, Role> = { PARENT: "PARENT", EDUCATEUR: "EDUCATOR", ADMIN: "ADMIN" };
const DAYS: Record<string, Weekday> = {
  lundi: "MONDAY",
  mardi: "TUESDAY",
  mercredi: "WEDNESDAY",
  jeudi: "THURSDAY",
  vendredi: "FRIDAY",
  samedi: "SATURDAY",
  dimanche: "SUNDAY",
};

export function parseDay(v: string | null): Weekday | null {
  if (!v) return null;
  const key = Object.keys(DAYS).find((d) => norm(v).includes(d));
  return key ? DAYS[key] : null;
}

// « 08h-11h », « 8h », « 17:30 » → créneau de 3 h contenant l'heure de début.
export function parseSlot(v: string | null): TimeSlot | null {
  const m = v?.match(/(\d{1,2})\s*[h:]/i) ?? v?.match(/^\s*(\d{1,2})\s*$/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h >= 8 && h < 11) return "S08_11";
  if (h >= 11 && h < 14) return "S11_14";
  if (h >= 14 && h < 17) return "S14_17";
  if (h >= 17 && h <= 20) return "S17_20";
  return null;
}

export function parseLevel(v: string | null): SubjectLevelValue | null {
  if (!v) return null;
  const t = norm(v);
  if (/tres bon|excellent|tres bien/.test(t)) return "VERY_GOOD";
  if (/faible|insuffisant|mauvais|nul/.test(t)) return "WEAK";
  if (/moyen|passable|assez/.test(t)) return "AVERAGE";
  if (/bon|bien/.test(t)) return "GOOD";
  return null;
}

const LEGACY_LEVEL_COLUMNS: Record<SubjectKey, string> = {
  francais: "niveau_francais",
  anglais: "niveau_anglais",
  allemand: "niveau_allemand",
  espagnol: "niveau_espagnol",
  philosophie: "niveau_philosophie",
  mathematiques: "niveau_mathematique",
  svt: "niveau_svt",
  pct: "niveau_pct",
  histgeo: "niveau_histgeo",
  economie: "niveau_economie",
  comptabilite: "niveau_comptabilite",
  comptagenerale: "niveau_comptagenerale",
  comptaanalytique: "niveau_comptaanalytique",
  comptasociete: "niveau_comptasociete",
  comptausuelle: "niveau_comptausuelle",
  ta: "niveau_ta",
  mathsfinancieres: "niveau_mathsfinanciere",
  mathsgenerales: "niveau_mathsgenerale",
  droit: "niveau_droit",
  fiscalite: "niveau_fiscalite",
};

const INSTALLMENT_STATUS: Record<string, { status: InstallmentStatus; payout: "NONE" | "PENDING" | "DONE" }> = {
  "en attente": { status: "PENDING", payout: "NONE" },
  provisoire: { status: "PAID", payout: "PENDING" },
  effectue: { status: "PAID", payout: "DONE" },
  suspendu: { status: "CANCELLED", payout: "NONE" },
};

async function tableExists(conn: mysql.Connection, table: string) {
  const [rows] = await conn.query("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", [table]);
  return (rows as Row[]).length > 0;
}

async function rows(conn: mysql.Connection, table: string): Promise<Row[]> {
  if (!(await tableExists(conn, table))) {
    warn(`Table ${table} absente de l'ancienne base : ignorée.`);
    return [];
  }
  const [result] = await conn.query(`SELECT * FROM \`${table}\``);
  return result as Row[];
}

async function main() {
  const url = process.env.LEGACY_MYSQL_URL;
  if (!url) throw new Error("LEGACY_MYSQL_URL n'est pas défini.");
  const conn = await mysql.createConnection({ uri: url, charset: "utf8mb4", dateStrings: false });
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const existing = await db.user.count({ where: { NOT: { isSuperAdmin: true } } });
  if (existing > 0 && !DRY_RUN) throw new Error(`La base cible contient déjà ${existing} utilisateur(s) : migration annulée.`);

  const legacy = {
    users: await rows(conn, "user"),
    educators: await rows(conn, "educateur"),
    children: await rows(conn, "enfant"),
    tariffs: await rows(conn, "tarif"),
    tutorings: await rows(conn, "tutorat"),
    lessons: await rows(conn, "seance"),
    payments: await rows(conn, "paiement"),
    complaints: await rows(conn, "reclamation"),
  };

  // Tout est écrit dans une seule transaction : en cas d'erreur, rien n'est importé.
  const work = async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">) => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await tx.setting.upsert({ where: { key }, create: { key, value: String(value) }, update: {} });
    }

    // --- Tarifs
    const tariffByClass = new Map<string, { hourlyRate: number; sessionsPerWeek: number; hoursPerSession: number }>();
    for (const t of legacy.tariffs) {
      const classLevel = str(t.classe_actuelle);
      const hourlyRate = int(t.tarif_horaire);
      if (!classLevel || !hourlyRate) continue;
      const rate = { hourlyRate, sessionsPerWeek: int(t.nbre_seances_semaine) ?? 2, hoursPerSession: Math.min(3, int(t.nbre_heure_seance) ?? 2) };
      tariffByClass.set(classLevel, rate);
      if (!(CLASS_LEVELS as readonly string[]).includes(classLevel)) warn(`Tarif pour une classe inconnue « ${classLevel} » importé tel quel.`);
      await tx.tariff.upsert({ where: { classLevel }, create: { classLevel, ...rate }, update: rate });
      count("tarifs");
    }

    // --- Utilisateurs
    const userIdByNpi = new Map<string, string>();
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    for (const u of legacy.users) {
      const npi = str(u.npi);
      const role = ROLE[String(u.role ?? "").toUpperCase()];
      const email = str(u.email)?.toLowerCase();
      const phone = str(u.telephone)?.replace(/[\s.-]/g, "");
      if (!npi || !role || !email || !phone) {
        warn(`Utilisateur ignoré (NPI, rôle, e-mail ou téléphone manquant) : ${npi ?? "?"}`);
        continue;
      }
      if (seenEmail.has(email) || seenPhone.has(phone)) {
        warn(`Utilisateur ${npi} ignoré : e-mail ou téléphone déjà utilisé par un autre compte.`);
        continue;
      }
      seenEmail.add(email);
      seenPhone.add(phone);
      const legacyPassword = str(u.password);
      const passwordHash = await hash(FORCE_RESET || !legacyPassword ? randomBytes(24).toString("base64url") : legacyPassword, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      const created = await tx.user.create({
        data: {
          npi,
          email,
          phone,
          firstName: str(u.firstname) ?? "",
          lastName: str(u.name) ?? "",
          role,
          passwordHash,
          address: str(u.adresse),
          createdAt: date(u.date_inscription) ?? new Date(),
        },
      });
      userIdByNpi.set(npi, created.id);
      count(`comptes ${role}`);
    }

    // --- Éducateurs
    const educatorIdByNpi = new Map<string, string>();
    const userStatus = new Map(legacy.users.map((u) => [str(u.npi), norm(str(u.statut_profil) ?? "")]));
    for (const e of legacy.educators) {
      const npi = str(e.npi);
      const userId = npi ? userIdByNpi.get(npi) : undefined;
      if (!npi || !userId) {
        warn(`Dossier éducateur ${npi ?? "?"} sans compte correspondant : ignoré.`);
        continue;
      }
      const legacyStatus = userStatus.get(npi) ?? "";
      const status = legacyStatus.startsWith("verifi") ? "VALIDATED" : legacyStatus.startsWith("rejet") ? "REJECTED" : "SUBMITTED";
      const profile = await tx.educatorProfile.create({
        data: {
          userId,
          birthDate: date(e.date_naissance),
          maritalStatus: str(e.situation_matrimoniale),
          experienceYears: int(e.experience),
          background: str(e.parcours),
          guarantor1Name: str(e.garant_1),
          guarantor1Address: str(e.adresse_garant1),
          guarantor2Name: str(e.garant_2),
          guarantor2Address: str(e.adresse_garant2),
          stars: int(e.etoiles),
          level: str(e.niveau),
          status,
          submittedAt: new Date(),
          validatedAt: status === "VALIDATED" ? new Date() : null,
          // Matières et classes n'existaient pas : à compléter par l'éducateur.
          subjects: [],
          classLevels: [],
        },
      });
      educatorIdByNpi.set(npi, profile.id);
      count("dossiers éducateurs");
      if (status === "VALIDATED") warn(`Éducateur ${npi} validé : matières, classes et numéro Mobile Money à compléter dans son dossier.`);

      const slots = new Set<string>();
      for (let i = 1; i <= 4; i++) {
        const day = parseDay(str(e[`dispo${i}_jour`]) ?? str(e[`dispo${i}`]));
        const slot = parseSlot(str(e[`dispo${i}_heure`]) ?? str(e[`dispo${i}`]));
        if (day && slot) slots.add(`${day}|${slot}`);
        else if (str(e[`dispo${i}`])) warn(`Disponibilité illisible pour ${npi} : « ${str(e[`dispo${i}`])} ».`);
      }
      for (const s of slots) {
        const [day, slot] = s.split("|") as [Weekday, TimeSlot];
        await tx.availability.create({ data: { educatorId: profile.id, day, slot } });
      }

      const documents = [
        ["carte_identite", "ID_CARD"],
        ["casier_judiciaire", "CRIMINAL_RECORD"],
        ["diplome_academique", "ACADEMIC_DIPLOMA"],
        ["diplome_professionnel", "PROFESSIONAL_DIPLOMA"],
        ["photo_educateur", "PHOTO"],
      ] as const;
      for (const [column, type] of documents) {
        const value = e[column];
        if (!Buffer.isBuffer(value) || value.length === 0) continue;
        if (DRY_RUN) {
          count("pièces justificatives");
          continue;
        }
        try {
          const stored = await storeBuffer(value, type === "PHOTO" ? ["image/jpeg", "image/png"] : ["application/pdf", "image/jpeg", "image/png"]);
          await tx.educatorDocument.create({ data: { educatorId: profile.id, type, originalName: `${column}-${npi}`, ...stored } });
          count("pièces justificatives");
        } catch (err) {
          warn(`Pièce ${column} de ${npi} non importée : ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    // --- Enfants
    const childIdByNpi = new Map<string, { id: string; parentId: string; classLevel: string }>();
    for (const c of legacy.children) {
      const npiChild = str(c.npi_enfant);
      const parentId = userIdByNpi.get(str(c.npi) ?? "");
      if (!npiChild || !parentId) {
        warn(`Enfant ${npiChild ?? "?"} sans parent connu : ignoré.`);
        continue;
      }
      const currentClass = str(c.classe_actuelle) ?? "";
      if (!(CLASS_LEVELS as readonly string[]).includes(currentClass)) warn(`Enfant ${npiChild} : classe « ${currentClass} » hors référentiel.`);
      const levels: { subject: string; level: SubjectLevelValue }[] = [];
      for (const subject of subjectsForClass(currentClass)) {
        const raw = str(c[LEGACY_LEVEL_COLUMNS[subject]]);
        const level = parseLevel(raw);
        if (level) levels.push({ subject, level });
        else if (raw) warn(`Enfant ${npiChild} : niveau « ${raw} » en ${subject} non reconnu, ignoré.`);
      }
      const child = await tx.child.create({
        data: {
          parentId,
          npi: /^\d{10}$/.test(npiChild) ? npiChild : null,
          firstName: str(c.prenom_enfant) ?? "",
          lastName: str(c.nom_enfant) ?? "",
          sex: norm(str(c.sexe_enfant) ?? "").startsWith("f") ? "F" : "M",
          birthDate: date(c.date_naissance) ?? new Date("2010-01-01"),
          previousClass: str(c.classe_precedente),
          previousSchool: str(c.ecole_precedente),
          currentClass,
          currentSchool: str(c.ecole_actuelle),
          favoriteSubjects: str(c.matieres_preferes),
          interests: str(c.centre_interet),
          createdAt: date(c.date_inscription) ?? new Date(),
          subjectLevels: { create: levels },
        },
      });
      childIdByNpi.set(npiChild, { id: child.id, parentId, classLevel: currentClass });
      count("enfants");
    }

    // --- Tutorats, échéances et reversements
    const tutoringIdByRef = new Map<string, string>();
    const paymentByRef = new Map(legacy.payments.map((p) => [str(p.reference_tutorat), p]));
    for (const t of legacy.tutorings) {
      const reference = str(t.reference_tutorat);
      const child = childIdByNpi.get(str(t.npi_enfant) ?? "");
      const educatorId = educatorIdByNpi.get(str(t.npi_educateur) ?? "");
      const parentId = userIdByNpi.get(str(t.npi_parent) ?? "");
      if (!reference || !child || !educatorId || !parentId) {
        warn(`Tutorat ${reference ?? "?"} incomplet (parent, enfant ou éducateur introuvable) : ignoré.`);
        continue;
      }
      const durationWeeks = Math.max(1, int(t.duree_tutorat) ?? 1);
      const startDate = date(t.date_tutorat) ?? new Date();
      const endDate = date(t.date_fin_tutorat) ?? addWeeks(startDate, durationWeeks);
      const rate = tariffByClass.get(child.classLevel) ?? { hourlyRate: 0, sessionsPerWeek: 2, hoursPerSession: 2 };
      if (rate.hourlyRate === 0) warn(`Tutorat ${reference} : aucun tarif pour ${child.classLevel}, tarif à 0 enregistré.`);
      const legacySlots = [str(t.seance1), str(t.seance2)].filter((s): s is string => Boolean(s));
      const legacyStatus = norm(str(t.statut_tutorat) ?? "");
      const active = legacyStatus.startsWith("en cours") && endDate > new Date();
      const tutoring = await tx.tutoring.create({
        data: {
          reference: `LEG-${reference}`.slice(0, 40),
          parentId,
          educatorId,
          childId: child.id,
          durationWeeks,
          startDate,
          endDate,
          status: active ? "ACTIVE" : "COMPLETED",
          classLevel: child.classLevel,
          ...rate,
          slotsLabel: legacySlots.join(", ") || "Non précisés",
          createdAt: startDate,
        },
      });
      tutoringIdByRef.set(reference, tutoring.id);
      count("tutorats");

      if (active) {
        for (const s of legacySlots) {
          const day = parseDay(s);
          const slot = parseSlot(s);
          if (!day || !slot) continue;
          const taken = await tx.bookedSlot.findUnique({ where: { educatorId_day_slot: { educatorId, day, slot } } });
          if (taken) warn(`Tutorat ${reference} : créneau ${s} déjà pris par un autre tutorat actif.`);
          else await tx.bookedSlot.create({ data: { tutoringId: tutoring.id, educatorId, day, slot } });
        }
      }

      const p = paymentByRef.get(reference);
      if (!p) {
        warn(`Tutorat ${reference} : aucun échéancier dans l'ancienne base.`);
        continue;
      }
      let fromWeek = 0;
      for (let i = 1; i <= 3; i++) {
        const amount = int(p[`montant_paiement${i}`]);
        if (amount === null) continue;
        const weeks = int(p[`seances_paiement${i}`]) ?? Math.min(4, Math.max(1, durationWeeks - fromWeek));
        const mapped = INSTALLMENT_STATUS[norm(str(p[`statut_paiement${i}`]) ?? "en attente")] ?? INSTALLMENT_STATUS["en attente"];
        const legacyDate = date(p[`date_paiement${i}`]);
        const installment = await tx.installment.create({
          data: {
            tutoringId: tutoring.id,
            index: i,
            weeks,
            amount,
            dueDate: legacyDate ?? addWeeks(startDate, fromWeek + weeks),
            status: mapped.status,
            paidAt: mapped.status === "PAID" ? (legacyDate ?? new Date()) : null,
            reference: `ECH-LEG-${str(p[`paiement${i}`]) ?? `${reference}-${i}`}`.slice(0, 40),
          },
        });
        fromWeek += weeks;
        count("échéances");
        // L'ancien système ne prélevait pas de commission : les reversements repris sont à 100 %.
        if (mapped.payout !== "NONE") {
          await tx.payout.create({
            data: {
              installmentId: installment.id,
              educatorId,
              grossAmount: amount,
              commissionAmount: 0,
              netAmount: amount,
              status: mapped.payout,
              method: mapped.payout === "DONE" ? "MANUAL" : null,
              providerReference: mapped.payout === "DONE" ? "Ancien système" : null,
              executedAt: mapped.payout === "DONE" ? (legacyDate ?? new Date()) : null,
            },
          });
          count(mapped.payout === "DONE" ? "reversements effectués" : "reversements à faire");
        }
      }
    }

    // --- Séances (validées d'office : l'ancien système n'avait pas de confirmation parent)
    for (const s of legacy.lessons) {
      const tutoringId = tutoringIdByRef.get(str(s.reference_tutorat) ?? "");
      const day = date(s.date_seance);
      if (!tutoringId || !day) {
        warn(`Séance ${str(s.id_seance) ?? "?"} sans tutorat ou sans date : ignorée.`);
        continue;
      }
      const slot = parseSlot(str(s.heure_seance)) ?? "S08_11";
      const exists = await tx.lesson.findUnique({ where: { tutoringId_date_slot: { tutoringId, date: day, slot } } });
      if (exists) {
        warn(`Séance ${str(s.id_seance)} en double (même date et créneau) : ignorée.`);
        continue;
      }
      const status: LessonStatus = "CONFIRMED";
      await tx.lesson.create({
        data: {
          tutoringId,
          date: day,
          slot,
          workDone: str(s.travail_effectue) ?? "Non renseigné",
          observation: str(s.observation),
          status,
          createdAt: day,
        },
      });
      count("séances");
    }

    // --- Réclamations
    for (const r of legacy.complaints) {
      const authorId = userIdByNpi.get(str(r.npi_demandant) ?? "");
      if (!authorId) {
        warn(`Réclamation ${str(r.id_reclamation) ?? str(r.id) ?? "?"} sans auteur connu : ignorée.`);
        continue;
      }
      const statut = norm(str(r.statut) ?? "");
      await tx.complaint.create({
        data: {
          authorId,
          subject: str(r.motif) ?? "Autre",
          details: str(r.details) ?? "",
          status: statut.startsWith("trait") || statut.startsWith("resol") ? "RESOLVED" : statut.startsWith("rejet") ? "REJECTED" : "OPEN",
          handledById: userIdByNpi.get(str(r.npi_traitant) ?? "") ?? null,
          handledAt: date(r.date_traitement),
          createdAt: date(r.date_demande) ?? new Date(),
        },
      });
      count("réclamations");
    }
  };

  class DryRunRollback extends Error {}
  try {
    await db.$transaction(async (tx) => {
      await work(tx);
      if (DRY_RUN) throw new DryRunRollback();
    }, { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 });
  } catch (err) {
    if (!(err instanceof DryRunRollback)) throw err;
  }

  console.log(`\n=== Migration ${DRY_RUN ? "(simulation, rien n'a été écrit)" : "terminée"} ===`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(28)} ${v}`);
  if (FORCE_RESET) console.log("\nMots de passe non repris : chaque utilisateur doit utiliser « Mot de passe oublié ».");
  else console.log("\nMots de passe repris (désormais hachés). Ils étaient en clair dans l'ancienne base : envisagez --force-reset.");
  console.log(`\n${report.length} point(s) d'attention :`);
  for (const line of report) console.log(`  ${line}`);

  await conn.end();
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
