import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

// Stockage des pièces justificatives sur disque, hors du dossier public :
// les fichiers ne sont servis que par /api/fichiers/[id], après contrôle des droits.
const root = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? "./storage");

const SIGNATURES: { mime: string; ext: string; bytes: number[] }[] = [
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

// Type détecté d'après le contenu réel du fichier, jamais d'après l'extension ou le type annoncé.
export function detectFileType(buffer: Buffer) {
  return SIGNATURES.find((s) => s.bytes.every((b, i) => buffer[i] === b)) ?? null;
}

export type StoredFile = { storageKey: string; mimeType: string; size: number };

export async function storeUpload(file: File, allowed: string[]): Promise<StoredFile> {
  if (file.size === 0) throw new Error("Le fichier est vide.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Le fichier dépasse 5 Mo.");
  return storeBuffer(Buffer.from(await file.arrayBuffer()), allowed);
}

export async function storeBuffer(buffer: Buffer, allowed: string[]): Promise<StoredFile> {
  const type = detectFileType(buffer);
  if (!type || !allowed.includes(type.mime)) throw new Error("Format accepté : " + allowed.map((m) => m.split("/")[1].toUpperCase()).join(", ") + ".");
  const storageKey = `${randomUUID()}.${type.ext}`;
  await mkdir(root, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ root, storageKey), buffer, { mode: 0o600 });
  return { storageKey, mimeType: type.mime, size: buffer.length };
}

function safePath(storageKey: string): string {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(storageKey)) throw new Error("Clé de stockage invalide.");
  return path.join(/*turbopackIgnore: true*/ root, storageKey);
}

export function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(safePath(storageKey));
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await unlink(safePath(storageKey)).catch(() => {});
}
