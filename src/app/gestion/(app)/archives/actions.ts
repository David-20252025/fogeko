"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import type { CategorieArchive } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { CATEGORIES_ARCHIVE } from "@/lib/archive-file";
import { assertPerm, assertSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeFiles, saveArchiveFile } from "@/lib/storage";

const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Import d'un fichier (le navigateur envoie les fichiers un par un pour rester sous la limite de taille). */
export async function importerArchive(_: FormState, f: FormData): Promise<FormState & { id?: number }> {
  const me = await assertPerm("ARCHIVES", "creer");
  const file = f.get("fichier");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier." };
  const categorie = s(f, "categorie") as CategorieArchive;
  if (!(categorie in CATEGORIES_ARCHIVE)) return { error: "Choisissez la catégorie." };
  const dateBrute = s(f, "dateDocument", 10);
  const dateDocument = dateBrute ? new Date(`${dateBrute}T00:00:00Z`) : null;
  if (dateDocument && Number.isNaN(dateDocument.getTime())) return { error: "Date du document invalide." };
  let info;
  try { info = await saveArchiveFile(file); } catch (e) { return { error: (e as Error).message }; }
  const titre = s(f, "titre") || info.nomOriginal.replace(/\.[^.]+$/, "");
  const motsCles = s(f, "motsCles", 300).split(/[,;]/).map((m) => m.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  try {
    const a = await db.archive.create({
      data: { titre, categorie, dateDocument, description: s(f, "description", 2000) || null, motsCles, ...info, importeParId: me.id },
    });
    await audit(me.id, "archive.import", "Archive", a.id, { titre, fichier: info.nomOriginal, taille: info.taille });
    revalidatePath("/gestion/archives");
    return { ok: true, id: a.id };
  } catch (e) {
    await removeFiles(`archives/${info.fichier}`);
    throw e;
  }
}

/** Suppression réservée au super admin : motif obligatoire, fichier effacé, fiche conservée pour la traçabilité. */
export async function supprimerArchive(id: number, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const motif = s(f, "motif", 500);
  if (motif.length < 5) return { error: "Le motif de suppression est obligatoire (5 caractères minimum)." };
  const a = await db.archive.findUnique({ where: { id }, include: { _count: { select: { dons: true, depenses: true, paiements: true } } } });
  if (!a || a.supprimeeLe) return { error: "Archive introuvable ou déjà supprimée." };
  if (a._count.dons + a._count.depenses + a._count.paiements > 0)
    return { error: "Ce document justifie une écriture financière : il ne peut pas être supprimé (les écritures financières sont conservées)." };
  await db.archive.update({ where: { id }, data: { supprimeeLe: new Date(), supprimeeParId: me.id, motifSuppression: motif } });
  await removeFiles(`archives/${a.fichier}`);
  await audit(me.id, "archive.suppression", "Archive", id, { titre: a.titre, fichier: a.nomOriginal, motif });
  revalidatePath("/gestion/archives");
  return { ok: true };
}
