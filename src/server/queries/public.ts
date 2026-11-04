import "server-only";
import { db } from "@/lib/db";
import { activeClasses } from "@/lib/curriculum";
import { getCurriculum } from "@/server/queries/curriculum";

// Données affichées aux visiteurs non connectés : uniquement ce qui peut être public.

// Grille tarifaire des classes actives, dans l'ordre du référentiel.
export async function publicTariffs() {
  const [tariffs, curriculum] = await Promise.all([db.tariff.findMany(), getCurriculum()]);
  const order = activeClasses(curriculum);
  return tariffs
    .filter((t) => order.includes(t.classLevel))
    .sort((a, b) => order.indexOf(a.classLevel) - order.indexOf(b.classLevel))
    .map(({ classLevel, hourlyRate, sessionsPerWeek, hoursPerSession }) => ({ classLevel, hourlyRate, sessionsPerWeek, hoursPerSession }));
}

// Aperçu public des éducateurs validés : prénom et initiale du nom, sans photo ni coordonnées
// (le profil complet reste réservé aux parents connectés).
export async function publicEducators(take = 12) {
  const educators = await db.educatorProfile.findMany({
    where: { status: "VALIDATED", user: { status: "ACTIVE" } },
    select: {
      id: true,
      subjects: true,
      classLevels: true,
      zone: true,
      stars: true,
      cycles: true,
      experienceYears: true,
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ stars: "desc" }, { validatedAt: "asc" }],
    take,
  });
  const ratings = await db.review.groupBy({
    by: ["educatorId"],
    where: { educatorId: { in: educators.map((e) => e.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byId = new Map(ratings.map((r) => [r.educatorId, r]));
  return educators.map(({ user, ...e }) => ({
    ...e,
    displayName: `${user.firstName} ${user.lastName.charAt(0).toUpperCase()}.`,
    initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
    avgRating: byId.get(e.id)?._avg.rating ?? null,
    reviewCount: byId.get(e.id)?._count.rating ?? 0,
  }));
}

export async function countValidatedEducators() {
  return db.educatorProfile.count({ where: { status: "VALIDATED", user: { status: "ACTIVE" } } });
}

// Avis laissés par les parents en fin de tutorat (seulement ceux avec un commentaire).
// Un avis positif tiré au hasard, pour le panneau de la page de connexion.
export async function featuredReview() {
  const where = { comment: { not: null }, rating: { gte: 4 } };
  const count = await db.review.count({ where });
  if (!count) return null;
  return db.review.findFirst({
    where,
    select: { rating: true, comment: true, parent: { select: { firstName: true } }, tutoring: { select: { classLevel: true } } },
    orderBy: { createdAt: "desc" },
    skip: Math.floor(Math.random() * count),
  });
}

export type FeaturedReview = NonNullable<Awaited<ReturnType<typeof featuredReview>>>;

export async function publicReviews(take = 30) {
  const where = { comment: { not: null } };
  const [reviews, stats] = await Promise.all([
    db.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        parent: { select: { firstName: true } },
        educator: { select: { subjects: true, user: { select: { firstName: true } } } },
        tutoring: { select: { classLevel: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    db.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
  ]);
  return { reviews, average: stats._avg.rating, count: stats._count.rating };
}
