import { randomInt } from "node:crypto";

// Alphabet sans caractères ambigus (0/O, 1/I/L) pour les références lues à voix haute ou au téléphone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length: number, alphabet = ALPHABET): string {
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[randomInt(alphabet.length)];
  return out;
}

export function tutoringReference(): string {
  return `TUT-${randomCode(8)}`;
}

export function installmentReference(): string {
  return `ECH-${randomCode(10)}`;
}

export function numericCode(length: number): string {
  return randomCode(length, "0123456789");
}
