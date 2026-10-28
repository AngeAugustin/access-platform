"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { subjectsForClass } from "@/lib/constants";
import { fullName } from "@/lib/format";
import {
  type ActionState,
  childSchema,
  fieldErrors,
  lessonReviewSchema,
  reviewSchema,
  stopTutoringSchema,
  tutoringSchema,
} from "@/lib/validation";
import { BusinessError, createTutoring, stopTutoring } from "@/server/services/tutoring";
import { startInstallmentPayment } from "@/server/services/payments";
import { FedapayError } from "@/server/services/fedapay";
import { notify, notifyAdmins } from "@/server/services/notify";

function parseChildForm(formData: FormData) {
  const levels: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("level_") && typeof value === "string" && value) levels[key.slice(6)] = value;
  }
  const raw = Object.fromEntries([...formData.entries()].filter(([k]) => !k.startsWith("level_")));
  return { ...raw, levels };
}

export async function saveChildAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const childId = formData.get("childId");
  const parsed = childSchema.safeParse(parseChildForm(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { levels, ...data } = parsed.data;

  const expected = subjectsForClass(data.currentClass);
  const missing = expected.filter((s) => !levels[s]);
  if (missing.length > 0) {
    return { ok: false, message: "Indiquez le niveau de l'enfant dans chaque matière." };
  }
  const levelRows = expected.map((subject) => ({ subject, level: levels[subject]! }));

  let id: string;
  try {
    if (typeof childId === "string" && childId) {
      const existing = await db.child.findFirst({ where: { id: childId, parentId: parent.id } });
      if (!existing) return { ok: false, message: "Enfant introuvable." };
      await db.$transaction([
        db.child.update({ where: { id: childId }, data: { ...data, npi: data.npi ?? null } }),
        db.subjectLevel.deleteMany({ where: { childId } }),
        db.subjectLevel.createMany({ data: levelRows.map((l) => ({ ...l, childId })) }),
      ]);
      id = childId;
    } else {
      const created = await db.child.create({
        data: { ...data, parentId: parent.id, subjectLevels: { create: levelRows } },
      });
      id = created.id;
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, errors: { npi: ["Ce NPI est déjà enregistré."] } };
    }
    throw err;
  }
  revalidatePath("/parent");
  redirect(`/parent/enfants/${id}`);
}

function parseSlots(formData: FormData) {
  return formData
    .getAll("slots")
    .filter((v): v is string => typeof v === "string")
    .map((v) => {
      const [day, slot] = v.split("|");
      return { day, slot };
    });
}

export async function createTutoringAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = tutoringSchema.safeParse({ ...Object.fromEntries(formData), slots: parseSlots(formData) });
  if (!parsed.success) return fieldErrors(parsed.error);
  let tutoringId: string;
  try {
    const tutoring = await createTutoring(parent.id, parsed.data);
    tutoringId = tutoring.id;
  } catch (err) {
    if (err instanceof BusinessError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath("/parent");
  redirect(`/parent/tutorats/${tutoringId}?nouveau=1`);
}

export async function stopTutoringAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = stopTutoringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await stopTutoring(parsed.data.tutoringId, { id: parent.id, role: "PARENT" }, parsed.data.reason);
  } catch (err) {
    if (err instanceof BusinessError) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath(`/parent/tutorats/${parsed.data.tutoringId}`);
  return { ok: true, message: "Le tutorat est arrêté. Les échéances ont été recalculées." };
}

export async function reviewLessonAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = lessonReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { lessonId, decision, comment } = parsed.data;
  if (decision === "DISPUTED" && !comment) {
    return { ok: false, errors: { comment: ["Expliquez ce qui ne va pas."] } };
  }
  const lesson = await db.lesson.findFirst({
    where: { id: lessonId, tutoring: { parentId: parent.id } },
    include: { tutoring: { include: { child: true, educator: true } } },
  });
  if (!lesson) return { ok: false, message: "Séance introuvable." };
  if (lesson.status !== "RECORDED") return { ok: false, message: "Cette séance a déjà été traitée." };
  await db.lesson.update({
    where: { id: lessonId },
    data: { status: decision, parentComment: comment ?? null, confirmedAt: new Date() },
  });
  await audit(parent.id, `lesson.${decision.toLowerCase()}`, "Lesson", lessonId);
  if (decision === "DISPUTED") {
    const body = `Le parent de ${fullName(lesson.tutoring.child)} conteste la séance du ${lesson.date.toISOString().slice(0, 10)} : ${comment}`;
    await notify({ userId: lesson.tutoring.educator.userId, type: "lesson.disputed", title: "Séance contestée", body, link: `/educateur/eleves/${lesson.tutoringId}` });
    await notifyAdmins({ type: "lesson.disputed", title: "Séance contestée", body, link: `/admin/tutorats/${lesson.tutoringId}` });
  }
  revalidatePath(`/parent/tutorats/${lesson.tutoringId}`);
  return { ok: true, message: decision === "CONFIRMED" ? "Séance confirmée." : "Contestation envoyée à l'éducateur et à Access." };
}

export async function reviewEducatorAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireRole("PARENT");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const tutoring = await db.tutoring.findFirst({
    where: { id: parsed.data.tutoringId, parentId: parent.id },
    include: { review: true, _count: { select: { lessons: true } } },
  });
  if (!tutoring) return { ok: false, message: "Tutorat introuvable." };
  if (tutoring.review) return { ok: false, message: "Vous avez déjà donné votre avis." };
  if (tutoring._count.lessons === 0) return { ok: false, message: "Vous pourrez noter l'éducateur après la première séance." };
  await db.review.create({
    data: {
      tutoringId: tutoring.id,
      parentId: parent.id,
      educatorId: tutoring.educatorId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    },
  });
  revalidatePath(`/parent/tutorats/${tutoring.id}`);
  return { ok: true, message: "Merci pour votre avis." };
}

export async function payInstallmentAction(installmentId: unknown): Promise<{ url?: string; error?: string }> {
  const parent = await requireRole("PARENT");
  if (typeof installmentId !== "string" || installmentId.length > 40) return { error: "Échéance introuvable." };
  if (!(await rateLimit(`pay:${parent.id}`, 10, 600))) {
    return { error: "Trop de tentatives de paiement. Réessayez dans quelques minutes." };
  }
  try {
    const url = await startInstallmentPayment(installmentId, parent.id);
    return { url };
  } catch (err) {
    if (err instanceof BusinessError || err instanceof FedapayError) return { error: err.message };
    console.error("[paiement]", err);
    return { error: "Le paiement n'a pas pu être lancé. Réessayez plus tard." };
  }
}
