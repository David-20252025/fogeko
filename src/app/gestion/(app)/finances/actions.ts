"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/admin/admin-form";
import type { CategorieDepense, Periodicite, Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { assertPerm, assertSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { suiviBudgets } from "@/lib/finance-calc";
import { normalizePhone } from "@/lib/members";
import { CATEGORIES_DEPENSE, DEVISES, moisDebut, MOYENS, parseMontant, PERIODICITES, TYPES_DONATEUR, type DeviseKey } from "@/lib/money";
import { prochainNumero } from "@/lib/numeros";
import { removeFiles, saveArchiveFile } from "@/lib/storage";

const s = (f: FormData, k: string, max = 160) => String(f.get(k) ?? "").trim().slice(0, max);
const done = (state: FormState = { ok: true }) => { revalidatePath("/gestion/finances", "layout"); return state; };

/** Champs communs : montant, devise, date (pas dans le futur), moyen de paiement. */
function commun(f: FormData, avecMoyen = true) {
  const montant = parseMontant(s(f, "montant", 30));
  const devise = s(f, "devise") as DeviseKey;
  const moyen = s(f, "moyen") as keyof typeof MOYENS;
  const date = new Date(`${s(f, "date", 10)}T12:00:00Z`);
  if (!montant) return { error: "Montant invalide (ex. 50 ou 1 500,50)." } as const;
  if (!(devise in DEVISES)) return { error: "Choisissez la devise." } as const;
  if (avecMoyen && !(moyen in MOYENS)) return { error: "Choisissez le mode de paiement." } as const;
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 86_400_000) return { error: "Date invalide (pas dans le futur)." } as const;
  return { montant, devise, moyen, date };
}

/** Membre retrouvé par son numéro (FOGEKO-0012 ou 12) ou son téléphone. */
async function trouverMembre(ref: string) {
  const num = /^(fogeko-?)?(\d{1,6})$/i.exec(ref.trim());
  if (num) return db.member.findUnique({ where: { numero: Number(num[2]) } });
  const tel = normalizePhone(ref);
  return tel ? db.member.findUnique({ where: { telephone: tel } }) : null;
}

type Fichier = Awaited<ReturnType<typeof saveArchiveFile>>;

/** Justificatif facultatif (champ « preuve ») : vrai type vérifié, enregistré comme archive « financier ». */
async function justificatif(f: FormData): Promise<Fichier | null> {
  const file = f.get("preuve");
  return file instanceof File && file.size > 0 ? saveArchiveFile(file) : null;
}

/** Crée l'archive du justificatif dans la transaction de l'écriture ; renvoie son id (ou null). */
const archiver = async (tx: Prisma.TransactionClient, j: Fichier | null, titre: string, userId: string, date: Date) =>
  j ? (await tx.archive.create({ data: { titre, categorie: "FINANCIER", dateDocument: date, ...j, motsCles: ["justificatif"], importeParId: userId } })).id : null;

/* ───── Dons ───── */

export async function addDon(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("FINANCES", "creer");
  const c = commun(f);
  if ("error" in c) return c;
  const type = s(f, "typeDonateur") as keyof typeof TYPES_DONATEUR;
  if (!(type in TYPES_DONATEUR)) return { error: "Choisissez le type de donateur." };
  let membreId: string | null = null;
  const donateur = s(f, "donateur") || null;
  if (type === "MEMBRE") {
    const m = await trouverMembre(s(f, "membreRef", 40));
    if (!m) return { error: "Membre introuvable : indiquez son numéro FOGEKO ou son téléphone." };
    membreId = m.id;
  } else if (type !== "ANONYME" && !donateur) return { error: "Indiquez le nom du donateur." };
  const tel = s(f, "telephone", 30);
  const telephone = tel ? normalizePhone(tel) : null;
  if (tel && !telephone) return { error: "Téléphone du donateur invalide." };

  let preuve: Fichier | null;
  try { preuve = await justificatif(f); } catch (e) { return { error: (e as Error).message }; }
  try {
    const don = await db.$transaction(async (tx) => {
      const numeroRecu = await prochainNumero(tx, "REC", c.date);
      return tx.don.create({
        data: {
          numeroRecu, date: c.date, montant: c.montant, devise: c.devise, moyen: c.moyen, typeDonateur: type, membreId,
          donateur: type === "MEMBRE" || type === "ANONYME" ? null : donateur, telephone,
          reference: s(f, "reference", 80) || null, motif: s(f, "motif", 300) || null, saisiParId: me.id,
          preuveId: await archiver(tx, preuve, `Preuve du don ${numeroRecu}`, me.id, c.date),
        },
      });
    });
    await audit(me.id, "don.creation", "Don", don.id, { numero: don.numeroRecu, montant: c.montant, devise: c.devise });
    return done();
  } catch (e) {
    if (preuve) await removeFiles(`archives/${preuve.fichier}`);
    throw e;
  }
}

/* ───── Dépenses ───── */

export async function addDepense(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("FINANCES", "creer");
  const c = commun(f, false);
  if ("error" in c) return c;
  const categorie = s(f, "categorie") as CategorieDepense;
  const beneficiaire = s(f, "beneficiaire"), description = s(f, "description", 1000);
  if (!(categorie in CATEGORIES_DEPENSE)) return { error: "Choisissez la catégorie." };
  if (beneficiaire.length < 2) return { error: "Indiquez le bénéficiaire ou le fournisseur." };
  if (description.length < 3) return { error: "Décrivez la dépense." };
  let preuve: Fichier | null;
  try { preuve = await justificatif(f); } catch (e) { return { error: (e as Error).message }; }
  const dep = await db.$transaction(async (tx) => tx.depense.create({
    data: {
      date: c.date, montant: c.montant, devise: c.devise, categorie, beneficiaire, description, saisiParId: me.id,
      justificatifId: await archiver(tx, preuve, `Justificatif : ${description.slice(0, 60)}`, me.id, c.date),
    },
  })).catch(async (e) => { if (preuve) await removeFiles(`archives/${preuve.fichier}`); throw e; });
  await audit(me.id, "depense.creation", "Depense", dep.id, { montant: c.montant, devise: c.devise, categorie });

  // Alerte de dépassement de budget, affichée tout de suite
  const budgets = await db.budget.findMany({ where: { categorie, devise: c.devise } });
  const depenses = await db.depense.findMany({ where: { categorie, devise: c.devise, date: { gte: new Date(Date.UTC(c.date.getUTCFullYear(), 0, 1)) } } });
  const depasses = suiviBudgets(budgets, depenses, c.date).filter((b) => b.depasse);
  return done({
    ok: true,
    ...(depasses.length > 0 && {
      info: `Attention : budget ${depasses.map((b) => `${b.periode === "MENSUEL" ? "mensuel" : "annuel"} « ${CATEGORIES_DEPENSE[categorie]} » dépassé (${b.pourcentage} %)`).join(", ")}.`,
    }),
  });
}

export async function setBudget(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("FINANCES", "modifier");
  const categorie = s(f, "categorie") as CategorieDepense;
  const devise = s(f, "devise") as DeviseKey;
  const periode = s(f, "periode") === "ANNUEL" ? "ANNUEL" : "MENSUEL";
  const brut = s(f, "montant", 30);
  if (!(categorie in CATEGORIES_DEPENSE) || !(devise in DEVISES)) return { error: "Catégorie ou devise invalide." };
  if (brut === "0" || brut === "") {
    await db.budget.deleteMany({ where: { categorie, devise, periode } });
  } else {
    const montant = parseMontant(brut);
    if (!montant) return { error: "Montant invalide (0 pour supprimer le budget)." };
    await db.budget.upsert({ where: { categorie_devise_periode: { categorie, devise, periode } }, create: { categorie, devise, periode, montant }, update: { montant } });
  }
  await audit(me.id, "budget.modification", "Budget", undefined, { categorie, devise, periode, montant: brut || "0" });
  return done();
}

/* ───── Membres rémunérés (désignation : super admin uniquement) ───── */

export async function designerRemunere(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const membre = await trouverMembre(s(f, "membreRef", 40));
  if (!membre) return { error: "Membre introuvable : indiquez son numéro FOGEKO ou son téléphone." };
  const fonction = s(f, "fonction", 120);
  const montant = parseMontant(s(f, "montant", 30));
  const devise = s(f, "devise") as DeviseKey;
  const periodicite = s(f, "periodicite") as Periodicite;
  const debut = moisDebut(s(f, "debut", 7));
  if (fonction.length < 2) return { error: "Indiquez la fonction." };
  if (!montant) return { error: "Montant convenu invalide." };
  if (!(devise in DEVISES) || !(periodicite in PERIODICITES) || !debut) return { error: "Devise, périodicité ou mois de début invalide." };
  const data = { fonction, montant, devise, periodicite, debut, actif: true, designeParId: me.id };
  const r = await db.membreRemunere.upsert({ where: { membreId: membre.id }, create: { membreId: membre.id, ...data }, update: data });
  await audit(me.id, "remuneration.designation", "MembreRemunere", r.id, { membre: `${membre.prenom} ${membre.nom}`, fonction, montant, devise, periodicite });
  return done();
}

export async function retirerRemunere(id: number) {
  const me = await assertSuperAdmin();
  const r = await db.membreRemunere.update({ where: { id }, data: { actif: false }, include: { membre: true } });
  await audit(me.id, "remuneration.retrait", "MembreRemunere", id, { membre: `${r.membre.prenom} ${r.membre.nom}` });
  done();
}

/* ───── Paiements des membres ───── */

export async function addPaiement(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("FINANCES", "creer");
  const c = commun(f);
  if ("error" in c) return c;
  const r = await db.membreRemunere.findUnique({ where: { id: Number(f.get("remunereId")) || 0 } });
  if (!r?.actif) return { error: "Ce membre n'est pas (ou plus) désigné comme rémunéré." };
  const periode = s(f, "periode", 7);
  if (!moisDebut(periode)) return { error: "Choisissez la période concernée." };
  if (c.devise !== r.devise) return { error: `Ce membre est rémunéré en ${r.devise}.` };
  if (await db.paiement.findFirst({ where: { remunereId: r.id, periode, annuleLe: null } }))
    return { error: `Un paiement existe déjà pour ${periode}. Annulez-le d'abord s'il est erroné.` };
  let preuve: Fichier | null;
  try { preuve = await justificatif(f); } catch (e) { return { error: (e as Error).message }; }
  try {
    const p = await db.$transaction(async (tx) => {
      const numeroBordereau = await prochainNumero(tx, "BOR", c.date);
      return tx.paiement.create({
        data: {
          numeroBordereau, remunereId: r.id, date: c.date, periode, montant: c.montant, devise: c.devise, moyen: c.moyen,
          reference: s(f, "reference", 80) || null, valideParId: me.id,
          preuveId: await archiver(tx, preuve, `Preuve du paiement ${numeroBordereau}`, me.id, c.date),
        },
      });
    });
    await audit(me.id, "paiement.creation", "Paiement", p.id, { bordereau: p.numeroBordereau, periode, montant: c.montant, devise: c.devise });
    return done();
  } catch (e) {
    if (preuve) await removeFiles(`archives/${preuve.fichier}`);
    throw e;
  }
}

/* ───── Annulation (aucune suppression des écritures) ───── */

export async function annuler(type: "don" | "depense" | "paiement", id: number, _: FormState, f: FormData): Promise<FormState> {
  const me = await assertPerm("FINANCES", "modifier");
  const motif = s(f, "motif", 500);
  if (motif.length < 5) return { error: "Le motif d'annulation est obligatoire (5 caractères minimum)." };
  const data = { annuleLe: new Date(), annuleParId: me.id, motifAnnulation: motif };
  const where = { id, annuleLe: null };
  const n = type === "don" ? await db.don.updateMany({ where, data })
    : type === "depense" ? await db.depense.updateMany({ where, data })
    : await db.paiement.updateMany({ where, data });
  if (n.count === 0) return { error: "Écriture introuvable ou déjà annulée." };
  await audit(me.id, `${type}.annulation`, type, id, { motif });
  return done();
}

/* ───── Fonds mensuel (super admin) ───── */

export async function declarerFonds(_: FormState, f: FormData): Promise<FormState> {
  const me = await assertSuperAdmin();
  const mois = moisDebut(s(f, "mois", 7));
  const montant = parseMontant(s(f, "montant", 30));
  const devise = s(f, "devise") as DeviseKey;
  if (!mois) return { error: "Choisissez le mois." };
  if (!montant) return { error: "Montant invalide (ex. 2 000 ou 1 500,50)." };
  if (!(devise in DEVISES)) return { error: "Choisissez la devise." };
  const data = { montant, note: s(f, "note", 500) || null, declareParId: me.id };
  await db.fondsMensuel.upsert({ where: { mois_devise: { mois, devise } }, update: data, create: { mois, devise, ...data } });
  await audit(me.id, "fonds.declaration", "FondsMensuel", undefined, { mois: mois.toISOString().slice(0, 7), devise, montant });
  return done();
}
