"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import { ADMINS, assertRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/members";
import { DEVISES, moisDebut, MOYENS, parseMontant, type DeviseKey } from "@/lib/money";

const s = (f: FormData, k: string, max = 160) => String(f.get(k) ?? "").trim().slice(0, max);

export async function addDon(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertRole(ADMINS);
  const montant = parseMontant(s(f, "montant", 30));
  const devise = s(f, "devise") as DeviseKey;
  const moyen = s(f, "moyen") as keyof typeof MOYENS;
  const date = new Date(`${s(f, "date", 10)}T12:00:00Z`);
  const tel = s(f, "telephone", 30);
  if (!montant) return { error: "Montant invalide (ex. 50 ou 1 500,50)." };
  if (!(devise in DEVISES)) return { error: "Choisissez la devise." };
  if (!(moyen in MOYENS)) return { error: "Choisissez le moyen de paiement." };
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) return { error: "Date invalide (pas dans le futur)." };
  const telephone = tel ? normalizePhone(tel) : null;
  if (tel && !telephone) return { error: "Numéro de téléphone du donateur invalide." };
  await db.don.create({
    data: {
      date, montant, devise, moyen, telephone,
      donateur: s(f, "donateur") || null,
      reference: s(f, "reference", 80) || null,
      note: s(f, "note", 500) || null,
      saisiParId: me.id,
    },
  });
  revalidatePath("/gestion/finances");
  return { ok: true };
}

export async function deleteDon(id: number) {
  await assertRole(["SUPERADMIN"]);
  await db.don.delete({ where: { id } });
  revalidatePath("/gestion/finances");
}

/** Déclare (ou corrige) le fonds d'un mois : un seul montant par mois et par devise. */
export async function declarerFonds(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertRole(["SUPERADMIN"]);
  const mois = moisDebut(s(f, "mois", 7));
  const montant = parseMontant(s(f, "montant", 30));
  const devise = s(f, "devise") as DeviseKey;
  if (!mois) return { error: "Choisissez le mois." };
  if (!montant) return { error: "Montant invalide (ex. 2 000 ou 1 500,50)." };
  if (!(devise in DEVISES)) return { error: "Choisissez la devise." };
  const data = { montant, note: s(f, "note", 500) || null, declareParId: me.id };
  await db.fondsMensuel.upsert({ where: { mois_devise: { mois, devise } }, update: data, create: { mois, devise, ...data } });
  revalidatePath("/gestion/finances");
  return { ok: true };
}
