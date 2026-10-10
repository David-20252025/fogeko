"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { assertRole, EDITORS } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMemberFields } from "@/lib/member-validate";
import { STATUTS, type StatutKey } from "@/lib/members";
import { removeFiles } from "@/lib/storage";

export type { FormState } from "@/components/admin/admin-form";
import type { FormState } from "@/components/admin/admin-form";

export async function updateMember(id: string, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const parsed = await parseMemberFields(f);
  if ("error" in parsed) return parsed;
  const statut = String(f.get("statut"));
  if (!(statut in STATUTS)) return { error: "Statut invalide." };
  try {
    await db.member.update({ where: { id }, data: { ...parsed.data, statut: statut as StatutKey } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Ce numéro de téléphone appartient déjà à un autre membre." };
    throw e;
  }
  revalidatePath(`/gestion/membres/${id}`);
  return { ok: true };
}

export async function setStatut(id: string, statut: StatutKey) {
  await assertRole(EDITORS);
  if (!(statut in STATUTS)) throw new Error("Statut invalide");
  await db.member.update({ where: { id }, data: { statut } });
  revalidatePath(`/gestion/membres/${id}`);
}

export async function deleteMember(id: string) {
  await assertRole(["ADMIN"]);
  const m = await db.member.delete({ where: { id } });
  await removeFiles(m.photo, m.photoThumb);
  redirect("/gestion/membres");
}
