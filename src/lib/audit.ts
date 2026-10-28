import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { requestInfo } from "@/lib/request";

export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
) {
  const { ip } = await requestInfo().catch(() => ({ ip: null }));
  await db.auditLog.create({ data: { actorId, action, entityType, entityId: entityId ?? null, metadata, ip } });
}
