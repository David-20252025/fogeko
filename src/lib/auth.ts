import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import type { Module } from "@/generated/prisma/client";
import { computePerms, type Action } from "./permissions";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

const COOKIE = "fogeko_session";
const TTL_S = 12 * 3600;
export const MAX_FAILS = 5;
export const LOCK_MS = 15 * 60_000;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET manquant ou trop court (32 caractères minimum)");
  return s;
}

// Le jeton embarque un bout du hash : changer le mot de passe invalide les sessions existantes
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function createSession(user: { id: string; passwordHash: string }) {
  const payload = Buffer.from(JSON.stringify({ u: user.id, v: user.passwordHash.slice(-12), e: Date.now() + TTL_S * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_S,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getUser = cache(async () => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const { u, v, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; v: string; e: number };
  if (e < Date.now()) return null;
  const user = await db.user.findUnique({
    where: { id: u },
    select: {
      id: true, name: true, email: true, photo: true, passwordHash: true,
      role: { select: { id: true, nom: true, superAdmin: true, permissions: true } },
      permissions: true,
    },
  });
  if (!user || user.passwordHash.slice(-12) !== v) return null;
  return {
    id: user.id, name: user.name, email: user.email, photo: user.photo,
    role: { id: user.role.id, nom: user.role.nom, superAdmin: user.role.superAdmin },
    perms: computePerms(user.role.superAdmin, user.role.permissions, user.permissions),
  };
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Pages : redirige vers la connexion si besoin. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/gestion/connexion");
  return user;
}

/** Pages : 403 si le compte n'a pas la permission sur le module (le module n'existe pas pour lui). */
export async function requirePerm(module: Module, action: Action = "voir") {
  const user = await requireUser();
  if (!user.perms[module][action]) forbidden();
  return user;
}

/** Pages réservées au super admin (comptes, rôles, journal, paramètres…). */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user.role.superAdmin) forbidden();
  return user;
}

/** Actions serveur : même contrôle, en levant une erreur (une action peut être appelée sans passer par la page). */
export async function assertPerm(module: Module, action: Action) {
  const user = await getUser();
  if (!user?.perms[module][action]) throw new Error("Accès refusé");
  return user;
}

export async function assertSuperAdmin() {
  const user = await getUser();
  if (!user?.role.superAdmin) throw new Error("Accès refusé");
  return user;
}
