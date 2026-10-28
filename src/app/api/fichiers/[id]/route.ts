import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { readStoredFile } from "@/server/services/storage";

// Pièces justificatives : accessibles au propriétaire et aux administrateurs.
// La photo d'un éducateur validé est aussi visible des parents connectés.
export async function GET(_: Request, ctx: RouteContext<"/api/fichiers/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié", { status: 401 });
  const { id } = await ctx.params;
  const doc = await db.educatorDocument.findUnique({
    where: { id },
    include: { educator: { select: { userId: true, status: true } } },
  });
  if (!doc) return new Response("Introuvable", { status: 404 });

  const allowed =
    user.role === "ADMIN" ||
    doc.educator.userId === user.id ||
    (doc.type === "PHOTO" && doc.educator.status === "VALIDATED" && user.role === "PARENT");
  if (!allowed) return new Response("Accès refusé", { status: 403 });

  const data = await readStoredFile(doc.storageKey).catch(() => null);
  if (!data) return new Response("Fichier manquant", { status: 404 });
  const filename = encodeURIComponent(doc.originalName);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${doc.mimeType === "application/pdf" && doc.type !== "PHOTO" ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
