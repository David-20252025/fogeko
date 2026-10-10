import { db } from "./db";
import { CATEGORIES_DEPENSE, DEVISES, MOYENS, type DeviseKey } from "./money";

export const TYPES = { don: "Don", depense: "Dépense", paiement: "Paiement membre", fonds: "Fonds mensuel" } as const;
export type TypeKey = keyof typeof TYPES;

export type Ligne = {
  key: string; type: TypeKey; id: number; date: Date; libelle: string; detail?: string; categorie?: string; sens: 1 | -1;
  montant: { toString(): string }; devise: DeviseKey; auteur: string; annuleLe: Date | null; motif: string | null; preuveId?: number | null;
};

export type FiltresFinance = {
  du: Date; au: Date; type?: TypeKey; devise?: DeviseKey; categorie?: keyof typeof CATEGORIES_DEPENSE;
  userId?: string; membre?: string; statut?: string;
};

/** Lit les filtres de l'URL (historique, rapports). Par défaut : du 1er janvier à aujourd'hui. */
export function parseFiltresFinance(sp: Record<string, string | string[] | undefined>): FiltresFinance {
  const p = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const jour = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const type = p("type"), devise = p("devise"), categorie = p("categorie");
  return {
    du: jour(p("du")) ? new Date(`${p("du")}T00:00:00Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
    // Fin de journée : les écritures du jour sont datées à midi (UTC)
    au: new Date(`${jour(p("au")) ?? new Date().toISOString().slice(0, 10)}T23:59:59Z`),
    type: type && type in TYPES ? (type as TypeKey) : undefined,
    devise: devise && devise in DEVISES ? (devise as DeviseKey) : undefined,
    categorie: categorie && categorie in CATEGORIES_DEPENSE ? (categorie as keyof typeof CATEGORIES_DEPENSE) : undefined,
    userId: p("userId"), membre: p("membre")?.slice(0, 60), statut: p("statut"),
  };
}

/** Toutes les écritures financières filtrées, les plus récentes d'abord (annulées incluses, sauf filtre de statut). */
export async function lignesFinance(f: FiltresFinance): Promise<Ligne[]> {
  const { type, devise, categorie, userId, membre, statut } = f;
  const date = { gte: f.du, lte: f.au };
  const dev = devise ? { devise } : {};
  const nomMembre = membre ? { OR: [{ nom: { contains: membre, mode: "insensitive" as const } }, { prenom: { contains: membre, mode: "insensitive" as const } }] } : undefined;

  const [dons, depenses, paiements, fonds] = await Promise.all([
    !type || type === "don" ? db.don.findMany({ where: { date, ...dev, ...(userId && { saisiParId: userId }), ...(nomMembre && { membre: nomMembre }), ...(categorie && { id: -1 }) }, include: { membre: true, saisiPar: { select: { name: true } } } }) : [],
    (!type || type === "depense") && !membre ? db.depense.findMany({ where: { date, ...dev, ...(userId && { saisiParId: userId }), ...(categorie && { categorie }) }, include: { saisiPar: { select: { name: true } } } }) : [],
    (!type || type === "paiement") && !categorie ? db.paiement.findMany({ where: { date, ...dev, ...(userId && { valideParId: userId }), ...(nomMembre && { remunere: { membre: nomMembre } }) }, include: { remunere: { include: { membre: true } }, validePar: { select: { name: true } } } }) : [],
    (!type || type === "fonds") && !membre && !categorie ? db.fondsMensuel.findMany({ where: { mois: date, ...dev, ...(userId && { declareParId: userId }) }, include: { declarePar: { select: { name: true } } } }) : [],
  ]);

  let lignes: Ligne[] = [
    ...dons.map((d) => ({ key: `d${d.id}`, type: "don" as const, id: d.id, date: d.date, libelle: `${d.numeroRecu} · ${d.membre ? `${d.membre.prenom} ${d.membre.nom}` : d.donateur ?? "Anonyme"}`, detail: [MOYENS[d.moyen], d.motif].filter(Boolean).join(" · "), sens: 1 as const, montant: d.montant, devise: d.devise, auteur: d.saisiPar.name, annuleLe: d.annuleLe, motif: d.motifAnnulation, preuveId: d.preuveId })),
    ...depenses.map((d) => ({ key: `x${d.id}`, type: "depense" as const, id: d.id, date: d.date, libelle: `${CATEGORIES_DEPENSE[d.categorie]} · ${d.beneficiaire}`, detail: d.description, categorie: CATEGORIES_DEPENSE[d.categorie], sens: -1 as const, montant: d.montant, devise: d.devise, auteur: d.saisiPar.name, annuleLe: d.annuleLe, motif: d.motifAnnulation, preuveId: d.justificatifId })),
    ...paiements.map((x) => ({ key: `p${x.id}`, type: "paiement" as const, id: x.id, date: x.date, libelle: `${x.numeroBordereau} · ${x.remunere.membre.prenom} ${x.remunere.membre.nom}`, detail: `Période ${x.periode} · ${MOYENS[x.moyen]}`, categorie: "Rémunérations", sens: -1 as const, montant: x.montant, devise: x.devise, auteur: x.validePar.name, annuleLe: x.annuleLe, motif: x.motifAnnulation, preuveId: x.preuveId })),
    ...fonds.map((f) => ({ key: `f${f.id}`, type: "fonds" as const, id: f.id, date: f.mois, libelle: `Fonds de ${f.mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}`, detail: f.note ?? undefined, sens: 1 as const, montant: f.montant, devise: f.devise, auteur: f.declarePar.name, annuleLe: null, motif: null })),
  ];
  if (statut === "annulees") lignes = lignes.filter((l) => l.annuleLe);
  if (statut === "valides") lignes = lignes.filter((l) => !l.annuleLe);
  return lignes.sort((a, b) => b.date.getTime() - a.date.getTime());
}
