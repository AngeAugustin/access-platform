"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { subjectKeyFromLabel } from "@/lib/curriculum";
import { type ActionState, classLevelSchema, fieldErrors, subjectSchema } from "@/lib/validation";

// Le référentiel alimente les formulaires et filtres de tous les espaces.
function refresh() {
  revalidatePath("/", "layout");
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

// ---------------------------------------------------------------------------
// Matières
// ---------------------------------------------------------------------------

export async function saveSubjectAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = subjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, label, active } = parsed.data;

  const duplicate = await db.subject.findFirst({ where: { label: { equals: label, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) } });
  if (duplicate) return { ok: false, errors: { label: ["Cette matière existe déjà."] } };

  if (id) {
    // La clé ne change jamais : elle est enregistrée dans les fiches des enfants et des éducateurs.
    const subject = await db.subject.update({ where: { id }, data: { label, active } });
    await audit(admin.id, "subject.update", "Subject", id, { label, active });
    refresh();
    return { ok: true, message: `Matière « ${subject.label} » enregistrée.` };
  }

  const base = subjectKeyFromLabel(label);
  if (!base) return { ok: false, errors: { label: ["Utilisez au moins une lettre ou un chiffre."] } };
  let key = base;
  for (let i = 2; await db.subject.findUnique({ where: { key } }); i++) key = `${base}-${i}`;
  const last = await db.subject.aggregate({ _max: { position: true } });
  const subject = await db.subject.create({ data: { key, label, active: true, position: (last._max.position ?? 0) + 1 } });
  await audit(admin.id, "subject.create", "Subject", subject.id, { key, label });
  refresh();
  return { ok: true, message: `Matière « ${label} » ajoutée. Associez-la aux classes concernées.` };
}

export async function deleteSubjectAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const subject = await db.subject.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!subject) return { ok: false, message: "Matière introuvable." };
  const [levels, educators] = await Promise.all([
    db.subjectLevel.count({ where: { subject: subject.key } }),
    db.educatorProfile.count({ where: { subjects: { has: subject.key } } }),
  ]);
  if (levels + educators > 0) {
    return { ok: false, message: `« ${subject.label} » est utilisée par ${levels} fiche(s) d'enfant et ${educators} éducateur(s) : désactivez-la plutôt.` };
  }
  await db.subject.delete({ where: { id: subject.id } });
  await audit(admin.id, "subject.delete", "Subject", subject.id, { key: subject.key });
  refresh();
  return { ok: true, message: `Matière « ${subject.label} » supprimée.` };
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export async function saveClassAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = classLevelSchema.safeParse({ ...Object.fromEntries(formData), subjects: formData.getAll("subjects") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, name, cycle, active, subjects: keys } = parsed.data;

  const subjects = await db.subject.findMany({ where: { key: { in: keys } }, select: { id: true } });
  if (subjects.length !== new Set(keys).size) return { ok: false, errors: { subjects: ["Matière invalide."] } };
  const links = subjects.map((s) => ({ subjectId: s.id }));

  try {
    if (!id) {
      const last = await db.classLevel.aggregate({ _max: { position: true } });
      const created = await db.classLevel.create({
        data: { name, cycle, active: true, position: (last._max.position ?? 0) + 1, subjects: { create: links } },
      });
      await audit(admin.id, "class.create", "ClassLevel", created.id, { name, subjects: keys });
      refresh();
      return { ok: true, message: `Classe « ${name} » ajoutée. Pensez à lui fixer un tarif.` };
    }

    const current = await db.classLevel.findUnique({ where: { id } });
    if (!current) return { ok: false, message: "Classe introuvable." };
    const renamed = current.name !== name;
    await db.$transaction([
      db.classLevel.update({ where: { id }, data: { name, cycle, active, subjects: { deleteMany: {}, create: links } } }),
      // Les fiches désignent la classe par son nom : un renommage est répercuté partout,
      // sauf dans les tutorats, qui gardent la classe au moment du contrat.
      ...(renamed
        ? [
            db.child.updateMany({ where: { currentClass: current.name }, data: { currentClass: name } }),
            db.tariff.updateMany({ where: { classLevel: current.name }, data: { classLevel: name } }),
            db.$executeRaw`UPDATE "EducatorProfile" SET "classLevels" = array_replace("classLevels", ${current.name}, ${name}) WHERE ${current.name} = ANY("classLevels")`,
          ]
        : []),
    ]);
    await audit(admin.id, "class.update", "ClassLevel", id, { ...(renamed ? { from: current.name } : {}), name, active, subjects: keys });
    refresh();
    return { ok: true, message: `Classe « ${name} » enregistrée.` };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, errors: { name: ["Une classe porte déjà ce nom."] } };
    throw err;
  }
}

export async function deleteClassAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const classe = await db.classLevel.findUnique({ where: { id: String(formData.get("id") ?? "") } });
  if (!classe) return { ok: false, message: "Classe introuvable." };
  const [children, educators] = await Promise.all([
    db.child.count({ where: { currentClass: classe.name } }),
    db.educatorProfile.count({ where: { classLevels: { has: classe.name } } }),
  ]);
  if (children + educators > 0) {
    return { ok: false, message: `« ${classe.name} » est utilisée par ${children} enfant(s) et ${educators} éducateur(s) : désactivez-la plutôt.` };
  }
  await db.$transaction([db.tariff.deleteMany({ where: { classLevel: classe.name } }), db.classLevel.delete({ where: { id: classe.id } })]);
  await audit(admin.id, "class.delete", "ClassLevel", classe.id, { name: classe.name });
  refresh();
  return { ok: true, message: `Classe « ${classe.name} » supprimée.` };
}

// ---------------------------------------------------------------------------
// Ordre d'affichage
// ---------------------------------------------------------------------------

const reorderSchema = z.object({ kind: z.enum(["class", "subject"]), ids: z.array(z.string().min(1)).min(1).max(500) });

// Enregistre l'ordre complet après un glisser-déposer : `ids` liste toutes les lignes, dans le nouvel ordre.
export async function reorderCurriculumAction(kind: "class" | "subject", ids: string[]): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  const parsed = reorderSchema.safeParse({ kind, ids });
  if (!parsed.success) return { ok: false, message: "Requête invalide." };

  const existing = kind === "class" ? await db.classLevel.findMany({ select: { id: true } }) : await db.subject.findMany({ select: { id: true } });
  const sameSet = existing.length === ids.length && new Set(ids).size === ids.length && existing.every((e) => ids.includes(e.id));
  if (!sameSet) return { ok: false, message: "La liste a changé entre-temps : rechargez la page." };

  if (kind === "class") {
    await db.$transaction(ids.map((id, i) => db.classLevel.update({ where: { id }, data: { position: i + 1 } })));
  } else {
    await db.$transaction(ids.map((id, i) => db.subject.update({ where: { id }, data: { position: i + 1 } })));
  }
  await audit(admin.id, kind === "class" ? "class.reorder" : "subject.reorder", kind === "class" ? "ClassLevel" : "Subject", null);
  refresh();
  return { ok: true };
}
