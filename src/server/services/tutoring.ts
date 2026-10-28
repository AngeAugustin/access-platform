import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { TimeSlot, Weekday } from "@/generated/prisma/client";
import { addWeeks, planInstallments, planStop } from "@/lib/billing";
import { TIME_SLOTS, WEEKDAYS } from "@/lib/constants";
import { formatFcfa, fullName } from "@/lib/format";
import { installmentReference, tutoringReference } from "@/lib/ids";
import { audit } from "@/lib/audit";
import { getSettings } from "./settings";
import { notify, notifyAdmins } from "./notify";

export class BusinessError extends Error {}

export function slotLabel(day: Weekday, slot: TimeSlot): string {
  return `${WEEKDAYS[day]} ${TIME_SLOTS[slot]}`;
}

export async function createTutoring(
  parentId: string,
  input: {
    childId: string;
    educatorId: string;
    durationWeeks: number;
    startDate: Date;
    slots: { day: Weekday; slot: TimeSlot }[];
  },
) {
  const settings = await getSettings();
  if (input.durationWeeks > settings.maxDurationWeeks) {
    throw new BusinessError(`La durée maximale est de ${settings.maxDurationWeeks} semaines.`);
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (input.startDate < today) throw new BusinessError("La date de début ne peut pas être passée.");

  const child = await db.child.findFirst({ where: { id: input.childId, parentId } });
  if (!child) throw new BusinessError("Enfant introuvable.");

  const educator = await db.educatorProfile.findFirst({
    where: { id: input.educatorId, status: "VALIDATED", user: { status: "ACTIVE" } },
    include: { availabilities: true, bookedSlots: true, user: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!educator) throw new BusinessError("Éducateur indisponible.");
  if (educator.classLevels.length > 0 && !educator.classLevels.includes(child.currentClass)) {
    throw new BusinessError(`Cet éducateur n'intervient pas en ${child.currentClass}.`);
  }

  const tariff = await db.tariff.findUnique({ where: { classLevel: child.currentClass } });
  if (!tariff) throw new BusinessError(`Aucun tarif n'est défini pour la classe ${child.currentClass}.`);

  const unique = new Set(input.slots.map((s) => `${s.day}:${s.slot}`));
  if (unique.size !== input.slots.length) throw new BusinessError("Un même créneau a été choisi deux fois.");
  if (input.slots.length !== tariff.sessionsPerWeek) {
    throw new BusinessError(`Choisissez exactement ${tariff.sessionsPerWeek} créneau(x) par semaine pour cette classe.`);
  }
  for (const s of input.slots) {
    if (!educator.availabilities.some((a) => a.day === s.day && a.slot === s.slot)) {
      throw new BusinessError(`${slotLabel(s.day, s.slot)} ne fait pas partie des disponibilités de l'éducateur.`);
    }
    if (educator.bookedSlots.some((b) => b.day === s.day && b.slot === s.slot)) {
      throw new BusinessError(`${slotLabel(s.day, s.slot)} est déjà réservé.`);
    }
  }

  const rate = { hourlyRate: tariff.hourlyRate, sessionsPerWeek: tariff.sessionsPerWeek, hoursPerSession: tariff.hoursPerSession };
  const plan = planInstallments(rate, input.durationWeeks, input.startDate, settings.weeksPerInstallment);

  let tutoring;
  try {
    tutoring = await db.$transaction(async (tx) => {
      const created = await tx.tutoring.create({
        data: {
          reference: tutoringReference(),
          parentId,
          educatorId: educator.id,
          childId: child.id,
          durationWeeks: input.durationWeeks,
          startDate: input.startDate,
          endDate: addWeeks(input.startDate, input.durationWeeks),
          classLevel: child.currentClass,
          ...rate,
          slotsLabel: input.slots.map((s) => slotLabel(s.day, s.slot)).join(", "),
        },
      });
      // La contrainte unique (éducateur, jour, créneau) bloque toute double réservation concurrente.
      await tx.bookedSlot.createMany({
        data: input.slots.map((s) => ({ tutoringId: created.id, educatorId: educator.id, day: s.day, slot: s.slot })),
      });
      await tx.installment.createMany({
        data: plan.map((p) => ({
          tutoringId: created.id,
          index: p.index,
          weeks: p.weeks,
          amount: p.amount,
          dueDate: p.dueDate,
          reference: installmentReference(),
        })),
      });
      return created;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new BusinessError("Un des créneaux vient d'être réservé par une autre famille. Choisissez-en un autre.");
    }
    throw err;
  }

  await audit(parentId, "tutoring.create", "Tutoring", tutoring.id, { educatorId: educator.id, childId: child.id });
  await notify({
    userId: educator.user.id,
    type: "tutoring.created",
    title: "Nouvel élève",
    body: `${fullName(child)} (${child.currentClass}) vous a été confié pour ${input.durationWeeks} semaine(s) : ${tutoring.slotsLabel}.`,
    link: `/educateur/eleves/${tutoring.id}`,
    email: true,
  });
  return tutoring;
}

export async function stopTutoring(tutoringId: string, actor: { id: string; role: "PARENT" | "ADMIN" }, reason: string) {
  const tutoring = await db.tutoring.findFirst({
    where: { id: tutoringId, ...(actor.role === "PARENT" ? { parentId: actor.id } : {}) },
    include: { installments: true, child: true, educator: { select: { userId: true } } },
  });
  if (!tutoring) throw new BusinessError("Tutorat introuvable.");
  if (tutoring.status !== "ACTIVE") throw new BusinessError("Ce tutorat est déjà terminé.");

  const stopDate = new Date();
  const changes = planStop(tutoring, tutoring.installments, tutoring.startDate, stopDate);

  await db.$transaction(async (tx) => {
    for (const c of changes) {
      if (c.kind === "cancel") {
        await tx.installment.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
      } else if (c.kind === "prorate") {
        // Le parent dispose d'une semaine pour régler la période recalculée.
        await tx.installment.update({
          where: { id: c.id },
          data: { weeks: c.weeks, amount: c.amount, dueDate: addWeeks(c.dueDate, 1), remindedAt: null },
        });
      }
    }
    await tx.bookedSlot.deleteMany({ where: { tutoringId } });
    await tx.tutoring.update({
      where: { id: tutoringId },
      data: { status: "STOPPED", stoppedAt: stopDate, stopReason: reason },
    });
  });

  await audit(actor.id, "tutoring.stop", "Tutoring", tutoringId, { reason, changes });
  await notify({
    userId: tutoring.educator.userId,
    type: "tutoring.stopped",
    title: "Tutorat arrêté",
    body: `Le tutorat de ${fullName(tutoring.child)} a été arrêté. Motif : ${reason}`,
    link: `/educateur/eleves/${tutoring.id}`,
    email: true,
  });
  const refunds = changes.filter((c) => c.kind === "refund-review");
  if (refunds.length > 0) {
    const total = refunds.reduce((sum, c) => sum + (c.kind === "refund-review" ? c.overpaidAmount : 0), 0);
    await notifyAdmins({
      type: "refund.review",
      title: "Remboursement à étudier",
      body: `Le tutorat ${tutoring.reference} a été arrêté après paiement : ${formatFcfa(total)} correspondent à des semaines non effectuées.`,
      link: `/admin/tutorats/${tutoring.id}`,
    });
  }
  return changes;
}

// Tâche quotidienne : clôture des tutorats arrivés à échéance et libération des créneaux.
export async function completeEndedTutorings(now = new Date()) {
  const ended = await db.tutoring.findMany({
    where: { status: "ACTIVE", endDate: { lte: now } },
    include: { child: true },
  });
  for (const t of ended) {
    await db.$transaction([
      db.bookedSlot.deleteMany({ where: { tutoringId: t.id } }),
      db.tutoring.update({ where: { id: t.id }, data: { status: "COMPLETED" } }),
    ]);
    await notify({
      userId: t.parentId,
      type: "tutoring.completed",
      title: "Tutorat terminé",
      body: `Le tutorat de ${fullName(t.child)} est terminé. Donnez votre avis sur l'éducateur.`,
      link: `/parent/tutorats/${t.id}`,
    });
  }
  return ended.length;
}
