"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { assertPerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMemberFields } from "@/lib/member-validate";
import { STATUTS, type StatutKey } from "@/lib/members";
import { removeFiles, saveMemberPhoto } from "@/lib/storage";

export type { FormState } from "@/components/admin/admin-form";
import type { FormState } from "@/components/admin/admin-form";

export async function updateMember(id: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("MEMBRES", "modifier");
  const parsed = await parseMemberFields(f);
  if ("error" in parsed) return parsed;
  const statut = String(f.get("statut"));
  if (!(statut in STATUTS)) return { error: "Statut invalide." };

  // Nouvelle photo facultative : vérifiée et réencodée, enregistrée sous un nouveau nom (pas de cache périmé)
  const photo = f.get("photo");
  let files: { photo: string; photoThumb: string } | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 12 * 1024 * 1024) return { error: "Photo trop lourde (12 Mo maximum)." };
    try {
      files = await saveMemberPhoto(Buffer.from(await photo.arrayBuffer()), randomUUID());
    } catch {
      return { error: "Le fichier n'est pas une photo valide (JPG, PNG ou WebP)." };
    }
  }
  const old = files && (await db.member.findUnique({ where: { id }, select: { photo: true, photoThumb: true } }));
  try {
    await db.member.update({ where: { id }, data: { ...parsed.data, statut: statut as StatutKey, ...files } });
  } catch (e) {
    if (files) await removeFiles(files.photo, files.photoThumb);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ce numéro de téléphone appartient déjà à un autre membre." };
    throw e;
  }
  if (old) {
    await removeFiles(old.photo, old.photoThumb);
    await audit(me.id, "membre.photo", "Member", id);
  }
  revalidatePath(`/gestion/membres/${id}`);
  return { ok: true };
}

/** Validation groupée : les candidatures « En attente » cochées passent à « Actif » (les autres statuts ne bougent pas). */
export async function validerSelection(f: FormData) {
  const me = await assertPerm("MEMBRES", "modifier");
  const ids = f.getAll("id").map(String).slice(0, 500);
  if (!ids.length) return;
  const r = await db.member.updateMany({ where: { id: { in: ids }, statut: "EN_ATTENTE" }, data: { statut: "ACTIF" } });
  await audit(me.id, "membre.validation", "Member", undefined, { nombre: r.count });
  revalidatePath("/gestion", "layout");
}

export async function setStatut(id: string, statut: StatutKey) {
  await assertPerm("MEMBRES", "modifier");
  if (!(statut in STATUTS)) throw new Error("Statut invalide");
  await db.member.update({ where: { id }, data: { statut } });
  revalidatePath(`/gestion/membres/${id}`);
}

export async function deleteMember(id: string) {
  const me = await assertPerm("MEMBRES", "supprimer");
  const m = await db.member.delete({ where: { id } });
  await removeFiles(m.photo, m.photoThumb);
  await audit(me.id, "membre.suppression", "Member", id, { numero: m.numero, nom: `${m.prenom} ${m.nom}` });
  redirect("/gestion/membres");
}
