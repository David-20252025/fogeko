"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/admin/admin-form";
import { audit } from "@/lib/audit";
import { assertSuperAdmin, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password";
import { computePerms, overridesFrom, parseGrid } from "@/lib/permissions";
import { removeFiles, saveMemberPhoto } from "@/lib/storage";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim().slice(0, 160);
const otherSuperAdmins = (id: string) => db.user.count({ where: { role: { superAdmin: true }, id: { not: id } } });

/** Création (id = null) ou modification d'un compte : rôle, permissions personnalisées, photo obligatoire. */
export async function saveAccount(id: string | null, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const name = s(f, "name"), email = s(f, "email").toLowerCase(), password = String(f.get("password") ?? "");
  const role = await db.role.findUnique({ where: { id: Number(f.get("roleId")) || 0 }, include: { permissions: true } });
  const photo = f.get("photo");
  const old = id ? await db.user.findUniqueOrThrow({ where: { id }, include: { role: true } }) : null;

  if (name.length < 2) return { error: "Nom obligatoire." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email invalide." };
  if (!role) return { error: "Choisissez un rôle." };
  if (!old || password) {
    const pb = passwordProblem(password);
    if (pb) return { error: pb };
  }
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (!old && !hasPhoto) return { error: "La photo de profil est obligatoire." };
  if (hasPhoto && photo.size > 12 * 1024 * 1024) return { error: "Photo trop lourde (12 Mo maximum)." };
  if (await db.user.findFirst({ where: { email, ...(id && { id: { not: id } }) } })) return { error: "Un compte existe déjà avec cet email." };
  if (old && old.id === me.id && role.id !== old.roleId) return { error: "Vous ne pouvez pas changer votre propre rôle." };
  if (old?.role.superAdmin && !role.superAdmin && (await otherSuperAdmins(old.id)) === 0) return { error: "Il doit rester au moins un super admin." };

  const userId = old?.id ?? randomUUID();
  let photoPath = old?.photo ?? null;
  if (hasPhoto) {
    try {
      // Rangée avec les photos des membres (dossier privé), préfixe « compte- »
      // Nouveau nom à chaque envoi (pas d'ancienne photo en cache) ; l'ancienne est supprimée après l'enregistrement
      photoPath = (await saveMemberPhoto(Buffer.from(await photo.arrayBuffer()), `compte-${userId}-${randomUUID().slice(0, 8)}`)).photo;
    } catch {
      return { error: "Le fichier n'est pas une photo valide (JPG, PNG ou WebP)." };
    }
  }

  // Seuls les écarts par rapport au rôle sont enregistrés ; un super admin a tout, sans personnalisation
  const overrides = role.superAdmin ? [] : overridesFrom(parseGrid(f), computePerms(false, role.permissions));
  const data = {
    name, email, roleId: role.id, photo: photoPath,
    ...(password && { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null }),
  };
  await db.$transaction([
    old ? db.user.update({ where: { id: userId }, data }) : db.user.create({ data: { id: userId, ...data, passwordHash: data.passwordHash! } }),
    db.userPermission.deleteMany({ where: { userId } }),
    db.userPermission.createMany({ data: overrides.map((o) => ({ userId, ...o })) }),
  ]);
  if (old?.photo && old.photo !== photoPath) await removeFiles(old.photo, old.photo.replace(".webp", "-mini.webp"));
  await audit(me.id, old ? "compte.modification" : "compte.creation", "User", userId, {
    email, role: role.nom, permissionsPersonnalisees: overrides.length, motDePasseChange: !!password,
  });
  revalidatePath("/gestion/administration/comptes");
  redirect("/gestion/administration/comptes");
}

export async function unlockAccount(id: string) {
  const me = await assertSuperAdmin();
  await db.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  await audit(me.id, "compte.deblocage", "User", id);
  revalidatePath("/gestion/administration/comptes");
}

export async function deleteAccount(id: string) {
  const me = await assertSuperAdmin();
  const target = await db.user.findUniqueOrThrow({ where: { id }, include: { role: true, _count: { select: { dons: true, fonds: true } } } });
  if (id === me.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  if (target.role.superAdmin && (await otherSuperAdmins(id)) === 0) throw new Error("Il doit rester au moins un super admin.");
  // Les écritures financières gardent leur auteur : un compte qui en a saisi n'est pas supprimable
  if (target._count.dons + target._count.fonds > 0) throw new Error("Ce compte a saisi des opérations financières : changez son mot de passe ou son rôle plutôt que de le supprimer.");
  await db.user.delete({ where: { id } });
  if (target.photo) await removeFiles(target.photo, target.photo.replace(".webp", "-mini.webp"));
  await audit(me.id, "compte.suppression", "User", id, { email: target.email, role: target.role.nom });
  revalidatePath("/gestion/administration/comptes");
  redirect("/gestion/administration/comptes");
}
