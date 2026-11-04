import { db } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/dal";
import { readStoredFile } from "@/server/services/storage";

type StoredDocument = { storageKey: string; mimeType: string; name: string; inline: boolean };

// Pièce d'un éducateur : accessible au propriétaire et aux administrateurs ;
// la photo d'un éducateur validé est aussi visible des parents connectés.
async function educatorDocument(id: string, user: CurrentUser): Promise<StoredDocument | null | false> {
  const doc = await db.educatorDocument.findUnique({ where: { id }, include: { educator: { select: { userId: true, status: true } } } });
  if (!doc) return null;
  const allowed = user.role === "ADMIN" || doc.educator.userId === user.id || (doc.type === "PHOTO" && doc.educator.status === "VALIDATED" && user.role === "PARENT");
  return allowed && { storageKey: doc.storageKey, mimeType: doc.mimeType, name: doc.originalName, inline: doc.mimeType !== "application/pdf" || doc.type === "PHOTO" };
}

// Pièce d'un tuteur : mêmes règles que pour un éducateur.
async function tutorDocument(id: string, user: CurrentUser): Promise<StoredDocument | null | false> {
  const doc = await db.tutorDocument.findUnique({ where: { id }, include: { tutor: { select: { userId: true, status: true } } } });
  if (!doc) return null;
  const allowed = user.role === "ADMIN" || doc.tutor.userId === user.id || (doc.type === "PHOTO" && doc.tutor.status === "VALIDATED" && user.role === "PARENT");
  return allowed && { storageKey: doc.storageKey, mimeType: doc.mimeType, name: doc.originalName, inline: doc.mimeType !== "application/pdf" || doc.type === "PHOTO" };
}

// Photo jointe à un retour de suivi : visible du parent, du tuteur et des administrateurs.
async function occurrencePhoto(id: string, user: CurrentUser): Promise<StoredDocument | null | false> {
  const photo = await db.occurrencePhoto.findUnique({
    where: { id },
    include: { occurrence: { select: { task: { select: { followUp: { select: { parentId: true, tutor: { select: { userId: true } } } } } } } } },
  });
  if (!photo) return null;
  const followUp = photo.occurrence.task.followUp;
  const allowed = user.role === "ADMIN" || followUp.parentId === user.id || followUp.tutor.userId === user.id;
  return allowed && { storageKey: photo.storageKey, mimeType: photo.mimeType, name: `retour-${photo.id}.${photo.mimeType === "image/png" ? "png" : "jpg"}`, inline: true };
}

export async function GET(_: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Non authentifié", { status: 401 });
  const { id } = await ctx.params;
  let doc = await educatorDocument(id, user);
  if (doc === null) doc = await tutorDocument(id, user);
  if (doc === null) doc = await occurrencePhoto(id, user);
  if (doc === null) return new Response("Introuvable", { status: 404 });
  if (!doc) return new Response("Accès refusé", { status: 403 });

  const data = await readStoredFile(doc.storageKey).catch(() => null);
  if (!data) return new Response("Fichier manquant", { status: 404 });
  const filename = encodeURIComponent(doc.name);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${doc.inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
