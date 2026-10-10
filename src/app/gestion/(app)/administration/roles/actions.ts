"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import { audit } from "@/lib/audit";
import { assertSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODULES, parseGrid } from "@/lib/permissions";

/** Enregistre la matrice d'un rôle (le rôle super admin n'est pas modifiable). */
export async function saveRole(roleId: number, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const role = await db.role.findUniqueOrThrow({ where: { id: roleId } });
  if (role.superAdmin) return { error: "Le rôle super admin a toujours toutes les permissions." };
  const nom = String(f.get("nom") ?? "").trim().slice(0, 60);
  if (nom.length < 2) return { error: "Nom du rôle trop court." };
  if (await db.role.findFirst({ where: { nom, id: { not: roleId } } })) return { error: "Un autre rôle porte déjà ce nom." };
  const grid = parseGrid(f);
  await db.$transaction([
    db.role.update({ where: { id: roleId }, data: { nom } }),
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.rolePermission.createMany({ data: MODULES.map(({ key }) => ({ roleId, module: key, ...grid[key] })) }),
  ]);
  await audit(me.id, "role.modification", "Role", roleId, { nom, permissions: grid });
  revalidatePath("/gestion/administration/roles");
  return { ok: true };
}

export async function createRole(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const nom = String(f.get("nom") ?? "").trim().slice(0, 60);
  const modele = Number(f.get("modele")) || 0;
  if (nom.length < 2) return { error: "Nom du rôle trop court." };
  if (await db.role.findUnique({ where: { nom } })) return { error: "Ce rôle existe déjà." };
  const source = modele ? await db.rolePermission.findMany({ where: { roleId: modele } }) : [];
  const role = await db.role.create({ data: { nom } });
  await db.rolePermission.createMany({
    data: MODULES.map(({ key }) => {
      const p = source.find((x) => x.module === key);
      return { roleId: role.id, module: key, voir: !!p?.voir, creer: !!p?.creer, modifier: !!p?.modifier, supprimer: !!p?.supprimer, exporter: !!p?.exporter };
    }),
  });
  await audit(me.id, "role.creation", "Role", role.id, { nom, modele });
  revalidatePath("/gestion/administration/roles");
  return { ok: true };
}

export async function deleteRole(roleId: number) {
  const me = await assertSuperAdmin();
  const role = await db.role.findUniqueOrThrow({ where: { id: roleId }, include: { _count: { select: { users: true } } } });
  if (role.superAdmin) throw new Error("Le rôle super admin ne peut pas être supprimé.");
  if (role._count.users > 0) throw new Error("Ce rôle est attribué à des comptes : changez d'abord leur rôle.");
  await db.role.delete({ where: { id: roleId } });
  await audit(me.id, "role.suppression", "Role", roleId, { nom: role.nom });
  revalidatePath("/gestion/administration/roles");
}
