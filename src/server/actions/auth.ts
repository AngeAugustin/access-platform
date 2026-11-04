"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions, destroyCurrentSession } from "@/lib/auth/session";
import { getCurrentUser, requireUser } from "@/lib/auth/dal";
import { isLocked, LOCK_AFTER_FAILURES, lockExpiry } from "@/lib/auth/lockout";
import { hit, peek, rateLimit, rateLimitIp, reset, resetsAt } from "@/lib/rate-limit";
import { verifyPow } from "@/lib/pow";
import { requestInfo } from "@/lib/request";
import { audit } from "@/lib/audit";
import { clearResetFlow, readResetFlow, writeResetFlow } from "@/lib/auth/reset-flow";
import { numericCode } from "@/lib/ids";
import { ROLE_HOME } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  type ActionState,
  changePasswordSchema,
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetCodeSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { emailButton, emailCode, emailSteps, escapeHtml, sendMail } from "@/server/services/mail";
import { notifyAdmins } from "@/server/services/notify";

// Après 3 échecs sur un compte (toutes origines confondues), la connexion exige une vérification anti-robot :
// le compte reste accessible à son titulaire, mais chaque essai coûte quelques secondes de calcul à un robot.
// Après 5 échecs depuis une même adresse IP sur un même compte, cette adresse est bloquée 15 minutes sur ce compte :
// Indépendamment, 5 échecs consécutifs sur un compte le verrouillent 24 h (voir src/lib/auth/lockout.ts) :
// l'événement est journalisé, les administrateurs et le titulaire sont prévenus, et seul un administrateur peut lever le verrou.
const POW_AFTER_FAILURES = 3;
const PAIR_MAX_FAILURES = 5;
const FAILURE_WINDOW_SECONDS = 15 * 60;
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

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// Compte un échec sur le compte et le verrouille au 5e. Renvoie true si le compte est (désormais) verrouillé.
async function recordFailedLogin(user: { id: string; email: string; firstName: string; lastName: string; role: string; educatorProfile: { id: string } | null }) {
  const { failedLogins } = await db.user.update({
    where: { id: user.id },
    data: { failedLogins: { increment: 1 } },
    select: { failedLogins: true },
  });
  await audit(user.id, "user.login_failed", "User", user.id, { attempt: failedLogins });
  if (failedLogins < LOCK_AFTER_FAILURES) return false;

  const until = lockExpiry();
  // Mise à jour conditionnelle : deux échecs simultanés ne posent (et ne journalisent) qu'un seul verrou.
  const { count } = await db.user.updateMany({
    where: { id: user.id, failedLogins: { gte: LOCK_AFTER_FAILURES }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: new Date() } }] },
    data: { lockedUntil: until, failedLogins: 0 },
  });
  if (count === 0) return true;
  await destroyAllSessions(user.id);
  await audit(null, "user.locked", "User", user.id, { failures: failedLogins, until: until.toISOString() });
  await notifyAdmins({
    type: "user.locked",
    title: "Compte verrouillé",
    body: `Le compte de ${user.firstName} ${user.lastName} est verrouillé 24 h après ${LOCK_AFTER_FAILURES} échecs de connexion.`,
    link: user.role === "EDUCATOR" && user.educatorProfile ? `/admin/educateurs/${user.educatorProfile.id}` : user.role === "PARENT" ? `/admin/parents/${user.id}` : "/admin/administrateurs",
  });
  await sendMail(
    user.email,
    "Votre compte Access est verrouillé",
    "Compte verrouillé",
    `<p>Bonjour ${escapeHtml(user.firstName)},</p><p>Après ${LOCK_AFTER_FAILURES} tentatives de connexion échouées, votre compte est verrouillé jusqu'au ${escapeHtml(formatDateTime(until))}.</p><p>Si vous n'êtes pas à l'origine de ces tentatives, contactez le support Access : seul un administrateur peut lever ce verrou avant son expiration.</p>`,
  ).catch(() => {});
  return true;
}

const lockedMessage: ActionState = {
  ok: false,
  message: `Ce compte est verrouillé pour 24 h après ${LOCK_AFTER_FAILURES} tentatives de connexion échouées. Contactez le support Access pour le faire débloquer.`,
};

const powRequired: ActionState = { ok: false, powRequired: true, message: "Vérification de sécurité en cours…" };

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await requestInfo();
  if (!(await rateLimitIp("register", ip, 10, 3600))) {
    return { ok: false, message: "Trop de tentatives. Réessayez dans une heure." };
  }
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;
  if (!(await verifyPow(formData.get("pow"), "register"))) return powRequired;

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
        ...(d.role === "TUTOR" ? { tutorProfile: { create: {} } } : {}),
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
  // Notifications et e-mail de bienvenue partent après la réponse : l'inscription n'attend pas Resend.
  if (d.role === "EDUCATOR") {
    after(async () => {
      await notifyAdmins({
        type: "educator.registered",
        title: "Nouvel éducateur inscrit",
        body: `${d.firstName} ${d.lastName} vient de créer son compte.`,
        link: "/admin/educateurs",
      });
      await sendMail(
        d.email,
        "Bienvenue chez Access : complétez votre dossier",
        `Bienvenue, ${d.firstName} !`,
        `<p>Votre compte éducateur est créé. Pour apparaître auprès des familles, il reste à compléter puis transmettre votre dossier :</p>
${emailSteps([
  "<strong>Votre profil</strong> : parcours, deux garants et numéro Mobile Money qui recevra vos paiements.",
  "<strong>Vos cours</strong> : matières, classes et disponibilités.",
  "<strong>Vos pièces</strong> : pièce d'identité, casier judiciaire, diplôme et photo.",
])}
<p>L'équipe Access vérifie ensuite votre dossier et vous prévient par e-mail dès qu'il est validé.</p>
${emailButton(`${process.env.APP_URL ?? ""}/educateur/dossier`, "Compléter mon dossier")}`,
        "Votre compte est créé : il reste à compléter votre dossier pour rencontrer vos premières familles.",
      ).catch(() => {});
    });
  }
  if (d.role === "TUTOR") {
    after(async () => {
      await notifyAdmins({
        type: "tutor.registered",
        title: "Nouveau tuteur inscrit",
        body: `${d.firstName} ${d.lastName} vient de créer son compte tuteur.`,
        link: "/admin/tuteurs",
      });
      await sendMail(
        d.email,
        "Bienvenue chez Access : complétez votre dossier",
        `Bienvenue, ${d.firstName} !`,
        `<p>Votre compte tuteur est créé. Pour être proposé aux familles, complétez votre dossier : votre profil, un garant, votre numéro Mobile Money, puis votre pièce d'identité, votre casier judiciaire et une photo.</p>
<p>L'équipe Access vérifie ensuite votre dossier et vous prévient par e-mail dès qu'il est validé.</p>
${emailButton(`${process.env.APP_URL ?? ""}/tuteur/dossier`, "Compléter mon dossier")}`,
        "Votre compte tuteur est créé : il reste à compléter votre dossier.",
      ).catch(() => {});
    });
  }
  await createSession(userId);
  redirect(d.role === "EDUCATOR" ? "/educateur/dossier" : d.role === "TUTOR" ? "/tuteur/dossier" : "/parent");
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, password, remember } = parsed.data;
  const { ip } = await requestInfo();

  if (!(await rateLimitIp("login", ip, 30, FAILURE_WINDOW_SECONDS))) {
    return { ok: false, message: "Trop de tentatives depuis votre connexion. Réessayez dans 15 minutes." };
  }
  const emailKey = `login:fail:email:${email}`;
  const pairKey = ip === "inconnue" ? null : `login:fail:pair:${email}:${ip}`;
  if (pairKey && (await peek(pairKey)) >= PAIR_MAX_FAILURES) {
    return { ok: false, message: "Trop d’échecs pour ce compte depuis votre connexion. Réessayez plus tard ou contactez le support Access." };
  }
  if ((await peek(emailKey)) >= POW_AFTER_FAILURES && !(await verifyPow(formData.get("pow"), "login"))) {
    return powRequired;
  }

  const user = await db.user.findUnique({ where: { email }, include: { educatorProfile: { select: { id: true } } } });
  const invalid: ActionState = { ok: false, message: "E-mail ou mot de passe incorrect." };
  const fail = async () => {
    await hit(emailKey, FAILURE_WINDOW_SECONDS);
    if (pairKey) await hit(pairKey, FAILURE_WINDOW_SECONDS);
  };
  if (!user) {
    await verifyAgainstDummy(password);
    await fail();
    return invalid;
  }
  if (isLocked(user.lockedUntil)) {
    // Le mot de passe n'est pas vérifié pendant le verrou : même un mot de passe juste est refusé.
    await verifyAgainstDummy(password);
    await fail();
    await audit(user.id, "user.login_blocked", "User", user.id);
    return lockedMessage;
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    await fail();
    return (await recordFailedLogin(user)) ? lockedMessage : invalid;
  }
  if (user.status !== "ACTIVE") {
    await audit(user.id, "user.login_refused", "User", user.id, { status: user.status });
    return {
      ok: false,
      message: user.status === "DEACTIVATED" ? "Ce compte est désactivé. Contactez le support Access." : "Ce compte est suspendu. Contactez le support Access.",
    };
  }
  await reset(emailKey);
  if (pairKey) await reset(pairKey);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null } });
  await createSession(user.id, remember === "on");
  await audit(user.id, "user.login", "User", user.id);
  redirect(user.mustChangePassword ? "/nouveau-mot-de-passe" : safeNext(formData.get("suite"), ROLE_HOME[user.role]));
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
  // Même suite que le compte existe ou non (pas d'indice sur les adresses inscrites) : on passe à la saisie du code.
  const done = async () => {
    await writeResetFlow({ email });
    redirect("/reinitialiser");
  };
  if (!(await verifyPow(formData.get("pow"), "forgot"))) return powRequired;
  // Trop de demandes : on le dit (le compteur vaut pour l'adresse saisie, inscrite ou non, donc rien n'est révélé).
  if (!(await rateLimitIp("reset", ip, 10, 3600)) || !(await rateLimit(`reset:email:${email}`, 5, 3600))) {
    const until = [await resetsAt(`reset:email:${email}`), await resetsAt(`reset:ip:${ip}`)].filter((d): d is Date => d !== null);
    const minutes = Math.max(1, Math.ceil((Math.max(...until.map((d) => d.getTime()), Date.now()) - Date.now()) / 60000));
    return {
      ok: false,
      message: `Trop de demandes de code en peu de temps. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}, ou utilisez le dernier code reçu (« J'ai déjà un code »).`,
    };
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
      `<p>Bonjour ${escapeHtml(user.firstName)},</p><p>Voici votre code pour choisir un nouveau mot de passe :</p>${emailCode(code)}<p>Il expire dans ${RESET_CODE_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`,
      `Votre code expire dans ${RESET_CODE_MINUTES} minutes.`,
    );
    await audit(user.id, "user.reset_requested", "User", user.id);
  }
  return done();
}

const invalidCode: ActionState = { ok: false, message: "Code invalide ou expiré. Vérifiez-le ou demandez un nouveau code." };

// Code en cours de validité pour cette adresse. Un code erroné compte comme un essai : après
// RESET_MAX_ATTEMPTS, il est invalidé, même si le bon est saisi ensuite.
async function checkResetCode(email: string, code: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const token = await db.passwordResetToken.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token || token.attempts >= RESET_MAX_ATTEMPTS) return null;
  if (!sameHash(token.codeHash, hashCode(user.id, code))) {
    await db.passwordResetToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return null;
  }
  return { user, token };
}

// Étape 2 : le code est vérifié sans être consommé, puis on passe au choix du mot de passe.
export async function verifyResetCodeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const flow = await readResetFlow();
  const parsed = resetCodeSchema.safeParse({ email: formData.get("email") ?? flow?.email, code: formData.get("code") });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, code } = parsed.data;
  if (!(await checkResetCode(email, code))) return invalidCode;
  await writeResetFlow({ email, code });
  redirect("/reinitialiser/mot-de-passe");
}

// Étape 3 : l'adresse et le code viennent du cookie du parcours et sont revérifiés avant le changement.
export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const flow = await readResetFlow();
  if (!flow?.code) return { ok: false, message: "La vérification du code a expiré. Recommencez depuis « Mot de passe oublié »." };
  const parsed = resetPasswordSchema.safeParse({ ...Object.fromEntries(formData), email: flow.email, code: flow.code });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { email, code, password } = parsed.data;
  const found = await checkResetCode(email, code);
  if (!found) return invalidCode;
  await db.$transaction([
    db.passwordResetToken.update({ where: { id: found.token.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: found.user.id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: false },
    }),
  ]);
  await destroyAllSessions(found.user.id);
  await clearResetFlow();
  await audit(found.user.id, "user.reset_done", "User", found.user.id);
  // Redirection plutôt qu'un message : sans le cookie du parcours, cette page renverrait à la saisie du code.
  redirect("/connexion?reinitialise=1");
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  // getCurrentUser et non requireUser : ce formulaire doit rester accessible avec un mot de passe provisoire.
  const current = await getCurrentUser();
  if (!current) redirect("/connexion");
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const user = await db.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.currentPassword))) {
    return { ok: false, errors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }
  if (parsed.data.password === parsed.data.currentPassword) {
    return { ok: false, errors: { password: ["Choisissez un mot de passe différent de l'actuel."] } };
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } });
  // Toutes les autres sessions sont fermées, puis une session neuve est ouverte ici.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await audit(user.id, "user.password_changed", "User", user.id, user.mustChangePassword ? { provisional: true } : undefined);
  if (user.mustChangePassword) redirect(ROLE_HOME[user.role]);
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
