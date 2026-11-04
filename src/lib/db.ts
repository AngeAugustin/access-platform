import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

function createClient() {
  // Connexion directe quand elle existe (Neon). Le pooler casse les requêtes préparées de Prisma.
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL n'est pas défini.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Une seule instance par processus (le rechargement à chaud du développement en recréerait sinon).
// Après un `prisma generate`, la classe rechargée diffère de celle de l'instance gardée : on la remplace,
// sinon le serveur de développement continuerait de valider les requêtes avec l'ancien schéma.
function client(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaClass === PrismaClient) return cached;
  if (cached) void cached.$disconnect().catch(() => {});
  return createClient();
}

export const db = client();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}
