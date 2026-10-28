"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroyCurrentSession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/dal";
import { rateLimit } from "@/lib/rate-limit";
import { requestInfo } from "@/lib/request";
import { audit } from "@/lib/audit";
import { numericCode } from "@/lib/ids";
import { ROLE_HOME } from "@/lib/constants";
import {
  type ActionState,
  changePasswordSchema,
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { escapeHtml, sendMail } from "@/server/services/mail";
import { notifyAdmins } from "@/server/services/notify";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_CODE_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;

function safeNext(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  // Uniquement un chemin interne : empêche les redirections ouvertes (//domaine, https://…).
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await requestInfo();
  if (!(await rateLimit(`register:${ip}`, 10, 3600))) {
    return { ok: false, message: "Trop de tentatives. Réessayez dans une heure." };
  }
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        npi: d.npi,
        email: d.email,
        phone: d.phone,
        firstName: d.firstName,
        lastName: d.lastName,
        city: d.city,
        address: d.address,
        role: d.role,
        passwordHash: await hashPassword(d.password),
        acceptedTermsAt: new Date(),
        ...(d.role === "EDUCATOR" ? { educatorProfile: { create: {} } } : {}),
      },
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Message volontairement générique : ne révèle pas quel identifiant existe déjà.
      return { ok: false, message: "Un compte existe déjà avec ce NPI, cet e-mail ou ce téléphone." };
    }
    throw err;
  }
  await audit(userId, "user.register", "User", userId, { role: d.role });
  if (d.role === "EDUCATOR") {
    await notifyAdmins({
      type: "educator.registered",
      title: "Nouvel éducateur inscrit",
      body: `${d.firstName} ${d.lastName} vient de créer son compte.`,
      link: "/admin/educateurs",
    });
  }
  await createSession(userId);
  redirect(d.role === "EDUCATOR" ? "/educateur/dossier" : "/parent");
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password } = parsed.data;
  const { ip } = await requestInfo();

  if (!(await rateLimit(`login:ip:${ip}`, 30, 900)) || !(await rateLimit(`login:email:${email}`, 10, 900))) {
    return { ok: false, message: "Trop de tentatives. Réessayez dans 15 minutes." };
  }

  const user = await db.user.findUnique({ where: { email } });
  const invalid: ActionState = { ok: false, message: "E-mail ou mot de passe incorrect." };
  if (!user) {
    await verifyAgainstDummy(password);
    return invalid;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, message: "Compte temporairement bloqué après plusieurs échecs. Réessayez plus tard." };
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60000) : undefined,
      },
    });
    await audit(user.id, "user.login_failed", "User", user.id);
    return invalid;
  }
  if (user.status !== "ACTIVE") {
    return { ok: false, message: "Ce compte est suspendu. Contactez le support Access." };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await createSession(user.id);
  await audit(user.id, "user.login", "User", user.id);
  redirect(safeNext(formData.get("suite"), ROLE_HOME[user.role]));
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/connexion");
}

export async function forgotPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email } = parsed.data;
  const { ip } = await requestInfo();
  const done: ActionState = {
    ok: true,
    message: "Si un compte correspond à cette adresse, un code à 6 chiffres vient d'y être envoyé. Il expire dans 15 minutes.",
  };
  if (!(await rateLimit(`reset:ip:${ip}`, 10, 3600)) || !(await rateLimit(`reset:email:${email}`, 3, 3600))) {
    return done;
  }
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.status === "ACTIVE") {
    const code = numericCode(6);
    await db.$transaction([
      // Un seul code valide à la fois.
      db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      db.passwordResetToken.create({
        data: {
          userId: user.id,
          codeHash: hashCode(user.id, code),
          expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60000),
        },
      }),
    ]);
    await sendMail(
      user.email,
      "Votre code de réinitialisation Access",
      "Réinitialisation du mot de passe",
      `<p>Bonjour ${escapeHtml(user.firstName)},</p><p>Votre code : <strong style="font-size:22px;letter-spacing:4px">${code}</strong></p><p>Il expire dans ${RESET_CODE_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    );
    await audit(user.id, "user.reset_requested", "User", user.id);
  }
  return done;
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, code, password } = parsed.data;
  const invalid: ActionState = { ok: false, message: "Code invalide ou expiré. Demandez un nouveau code." };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return invalid;
  const token = await db.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token || token.attempts >= RESET_MAX_ATTEMPTS) return invalid;
  if (token.codeHash !== hashCode(user.id, code)) {
    await db.passwordResetToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return invalid;
  }
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null },
    }),
  ]);
  await destroyAllSessions(user.id);
  await audit(user.id, "user.reset_done", "User", user.id);
  return { ok: true, message: "Mot de passe modifié. Vous pouvez vous connecter." };
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const user = await db.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  // Toutes les autres sessions sont fermées, puis une session neuve est ouverte ici.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await audit(user.id, "user.password_changed", "User", user.id);
  return { ok: true, message: "Mot de passe modifié. Vos autres appareils ont été déconnectés." };
}

export async function updateProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const current = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  try {
    await db.user.update({
      where: { id: current.id },
      data: { ...parsed.data, city: parsed.data.city ?? null, address: parsed.data.address ?? null },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, errors: { phone: ["Ce numéro est déjà utilisé."] } };
    }
    throw err;
  }
  return { ok: true, message: "Profil mis à jour." };
}
