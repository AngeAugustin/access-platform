import "server-only";
import { cookies } from "next/headers";

// Parcours « mot de passe oublié » en trois écrans : e-mail, code, nouveau mot de passe.
// L'adresse (puis le code vérifié) passe d'un écran à l'autre dans un cookie httpOnly de courte durée,
// jamais dans l'URL. Le code n'y fait pas foi : il est revérifié en base au moment de changer le mot de passe.

const RESET_COOKIE = "access_reset";
const MAX_AGE_SECONDS = 15 * 60;

export type ResetFlow = { email: string; code?: string };

export async function readResetFlow(): Promise<ResetFlow | null> {
  const raw = (await cookies()).get(RESET_COOKIE)?.value;
  if (!raw) return null;
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof data?.email !== "string") return null;
    return { email: data.email, code: typeof data.code === "string" ? data.code : undefined };
  } catch {
    return null;
  }
}

export async function writeResetFlow(flow: ResetFlow) {
  (await cookies()).set(RESET_COOKIE, Buffer.from(JSON.stringify(flow)).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearResetFlow() {
  (await cookies()).delete(RESET_COOKIE);
}

// « augustin@gmail.com » → « au••••@gmail.com » : rappelle l'adresse sans l'afficher en entier.
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}••••@${domain}`;
}
