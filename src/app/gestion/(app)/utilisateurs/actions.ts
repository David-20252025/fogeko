"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import type { Role } from "@/generated/prisma/client";
import { assertRole, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password";

const ROLES: Role[] = ["ADMIN", "SECRETAIRE", "LECTEUR"];
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 160);

export async function createUser(_: FormState, f: FormData): Promise<FormState> {
  await assertRole(["ADMIN"]);
  const email = s(f, "email").toLowerCase(), name = s(f, "name"), role = s(f, "role") as Role, password = String(f.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email invalide." };
  if (name.length < 2) return { error: "Nom obligatoire." };
  if (!ROLES.includes(role)) return { error: "Rôle invalide." };
  const pb = passwordProblem(password);
  if (pb) return { error: pb };
  if (await db.user.findUnique({ where: { email } })) return { error: "Un compte existe déjà avec cet email." };
  await db.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) } });
  revalidatePath("/gestion/utilisateurs");
  return { ok: true };
}

export async function updateUser(id: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertRole(["ADMIN"]);
  const name = s(f, "name"), role = s(f, "role") as Role, password = String(f.get("password") ?? "");
  if (name.length < 2) return { error: "Nom obligatoire." };
  if (!ROLES.includes(role)) return { error: "Rôle invalide." };
  if (role !== "ADMIN" && (id === me.id || (await db.user.count({ where: { role: "ADMIN", id: { not: id } } })) === 0))
    return { error: "Impossible de retirer ce rôle : il doit rester au moins un administrateur (et vous ne pouvez pas vous rétrograder vous-même)." };
  if (password) {
    const pb = passwordProblem(password);
    if (pb) return { error: pb };
  }
  await db.user.update({
    where: { id },
    data: { name, role, ...(password && { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null }) },
  });
  revalidatePath("/gestion/utilisateurs");
  return { ok: true };
}

export async function unlockUser(id: string) {
  await assertRole(["ADMIN"]);
  await db.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  revalidatePath("/gestion/utilisateurs");
}

export async function deleteUser(id: string) {
  const me = await assertRole(["ADMIN"]);
  if (id === me.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  await db.user.delete({ where: { id } });
  revalidatePath("/gestion/utilisateurs");
}
