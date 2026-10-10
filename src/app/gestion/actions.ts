"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession, LOCK_MS, MAX_FAILS, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

// Hash factice : la vérification prend le même temps, que l'email existe ou non
const DUMMY = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export async function login(_: { error?: string }, f: FormData): Promise<{ error?: string }> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  // Par connexion : 20 échecs / 15 min freinent le test massif de mots de passe sur plusieurs comptes
  const ipKey = `login:${await clientIp()}`;
  if (!rateLimit(ipKey, 20, 15 * 60_000, { record: false })) return { error: "Trop de tentatives depuis cette connexion. Réessayez dans 15 minutes." };
  const password = String(f.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const min = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Trop de tentatives. Compte bloqué pendant encore ${min} min.` };
  }
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY);
  if (!user || !ok) {
    rateLimit(ipKey, 20, 15 * 60_000);
    if (user) {
      const fails = user.failedLogins + 1;
      await db.user.update({
        where: { id: user.id },
        data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails },
      });
    }
    return { error: "Email ou mot de passe incorrect." };
  }
  await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession(user);
  redirect("/gestion");
}

export async function logout() {
  await destroySession();
  redirect("/gestion/connexion");
}
