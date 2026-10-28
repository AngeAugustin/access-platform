import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type CatalogFilters = { classe?: string; matiere?: string; zone?: string; jour?: string };

// Catalogue public (aux parents connectés) : uniquement les éducateurs validés et actifs.
export async function listCatalog(filters: CatalogFilters) {
  const where: Prisma.EducatorProfileWhereInput = { status: "VALIDATED", user: { status: "ACTIVE" } };
  if (filters.classe) where.classLevels = { has: filters.classe };
  if (filters.matiere) where.subjects = { has: filters.matiere };
  if (filters.zone) where.zone = { contains: filters.zone, mode: "insensitive" };
  if (filters.jour) where.availabilities = { some: { day: filters.jour as never } };

  const educators = await db.educatorProfile.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true } },
      documents: { where: { type: "PHOTO" }, select: { id: true } },
      availabilities: true,
      bookedSlots: { select: { day: true, slot: true } },
    },
    orderBy: [{ stars: "desc" }, { validatedAt: "asc" }],
    take: 60,
  });
  const ratings = await db.review.groupBy({
    by: ["educatorId"],
    where: { educatorId: { in: educators.map((e) => e.id) } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byId = new Map(ratings.map((r) => [r.educatorId, r]));
  return educators.map((e) => ({
    ...e,
    freeSlots: e.availabilities.filter((a) => !e.bookedSlots.some((b) => b.day === a.day && b.slot === a.slot)).length,
    avgRating: byId.get(e.id)?._avg.rating ?? null,
    reviewCount: byId.get(e.id)?._count.rating ?? 0,
  }));
}
