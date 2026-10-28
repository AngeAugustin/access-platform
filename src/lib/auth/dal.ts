import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { readSession } from "./session";

export type CurrentUser = {
  id: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
};

// Couche d'accès aux données : point unique de lecture de l'utilisateur courant, mémorisé par requête.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  const { id, role, firstName, lastName, email, isSuperAdmin } = session.user;
  return { id, role, firstName, lastName, email, isSuperAdmin };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== role) forbidden();
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireRole("ADMIN");
  if (!user.isSuperAdmin) forbidden();
  return user;
}
