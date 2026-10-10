"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import type { Role } from "@/generated/prisma/client";
import { ADMINS, assertRole, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password";
import { assignableRoles, canManage } from "@/lib/roles";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 160);

// Il doit toujours rester au moins un super administrateur (seul à pouvoir déclarer les fonds)
const otherSuperAdmins = (id: string) => db.user.count({ where: { role: "SUPERADMIN", id: { not: id } } });

export async function createUser(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertRole(ADMINS);
  const email = s(f, "email").toLowerCase(), name = s(f, "name"), role = s(f, "role") as Role, password = String(f.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email invalide." };
  if (name.length < 2) return { error: "Nom obligatoire." };
  if (!assignableRoles(me.role).includes(role)) return { error: "Vous ne pouvez pas attribuer ce rôle." };
  const pb = passwordProblem(password);
  if (pb) return { error: pb };
  if (await db.user.findUnique({ where: { email } })) return { error: "Un compte existe déjà avec cet email." };
  await db.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) } });
  revalidatePath("/gestion/utilisateurs");
  return { ok: true };
}

export async function updateUser(id: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertRole(ADMINS);
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  if (!canManage(me.role, target.role)) return { error: "Seul un super administrateur peut modifier ce compte." };
  const name = s(f, "name"), role = s(f, "role") as Role, password = String(f.get("password") ?? "");
  if (name.length < 2) return { error: "Nom obligatoire." };
  if (!assignableRoles(me.role).includes(role)) return { error: "Vous ne pouvez pas attribuer ce rôle." };
  if (id === me.id && role !== me.role) return { error: "Vous ne pouvez pas changer votre propre rôle." };
  if (target.role === "SUPERADMIN" && role !== "SUPERADMIN" && (await otherSuperAdmins(id)) === 0)
    return { error: "Il doit rester au moins un super administrateur." };
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
  const me = await assertRole(ADMINS);
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  if (!canManage(me.role, target.role)) throw new Error("Accès refusé");
  await db.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  revalidatePath("/gestion/utilisateurs");
}

export async function deleteUser(id: string) {
  const me = await assertRole(ADMINS);
  const target = await db.user.findUniqueOrThrow({ where: { id }, include: { _count: { select: { dons: true, fonds: true } } } });
  if (id === me.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  if (!canManage(me.role, target.role)) throw new Error("Accès refusé");
  if (target.role === "SUPERADMIN" && (await otherSuperAdmins(id)) === 0) throw new Error("Il doit rester au moins un super administrateur.");
  // Les écritures financières gardent leur auteur : un compte qui en a saisi n'est pas supprimable
  if (target._count.dons + target._count.fonds > 0) throw new Error("Ce compte a saisi des opérations financières : changez son mot de passe ou son rôle plutôt que de le supprimer.");
  await db.user.delete({ where: { id } });
  revalidatePath("/gestion/utilisateurs");
}
