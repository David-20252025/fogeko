import type { Prisma } from "@/generated/prisma/client";
import { CATEGORIES, STATUTS, type CategorieKey, type StatutKey } from "./members";

export type MemberFilters = { q?: string; categorie?: CategorieKey; communeId?: number; quartier?: string; statut?: StatutKey };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Lit les filtres depuis l'URL (liste, export Excel et impression PDF partagent les mêmes). */
export function parseFilters(sp: Record<string, string | string[] | undefined>): MemberFilters {
  const categorie = one(sp.categorie), statut = one(sp.statut), commune = Number(one(sp.communeId));
  return {
    q: one(sp.q)?.slice(0, 80),
    categorie: categorie && categorie in CATEGORIES ? (categorie as CategorieKey) : undefined,
    statut: statut && statut in STATUTS ? (statut as StatutKey) : undefined,
    communeId: Number.isInteger(commune) && commune > 0 ? commune : undefined,
    quartier: one(sp.quartier)?.slice(0, 80),
  };
}

export function memberWhere(f: MemberFilters): Prisma.MemberWhereInput {
  const and: Prisma.MemberWhereInput[] = [];
  if (f.q) {
    const or: Prisma.MemberWhereInput[] = f.q.split(/\s+/).map((w) => ({
      OR: (["nom", "postNom", "prenom"] as const).map((k) => ({ [k]: { contains: w, mode: "insensitive" } })),
    }));
    const digits = f.q.replace(/\D/g, "").replace(/^(243|0)/, "");
    // Recherche par nom (tous les mots) OU par numéro de téléphone / numéro FOGEKO
    and.push({
      OR: [
        { AND: or },
        ...(digits.length >= 3 ? [{ telephone: { contains: digits } }] : []),
        ...(/^\d{1,6}$/.test(f.q.replace(/^fogeko-?/i, "")) ? [{ numero: Number(f.q.replace(/^fogeko-?/i, "")) }] : []),
      ],
    });
  }
  if (f.categorie) and.push({ categorie: f.categorie });
  if (f.statut) and.push({ statut: f.statut });
  if (f.communeId) and.push({ communeId: f.communeId });
  if (f.quartier) and.push({ quartier: { contains: f.quartier, mode: "insensitive" } });
  return { AND: and };
}

export const filtersToQuery = (f: MemberFilters) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
