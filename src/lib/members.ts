export const CATEGORIES = { MAMAN: "Mamans", PAPA: "Papas", JEUNE: "Jeunes", PASTEUR: "Pasteurs" } as const;
export type CategorieKey = keyof typeof CATEGORIES;

export const formatNumero = (n: number) => `FOGEKO-${String(n).padStart(4, "0")}`;

// Numéros RDC : accepte 0812345678, 812345678, +243 81 234 56 78, 00243… → +243812345678
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s.\-()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("243")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^[89]\d{8}$/.test(d) ? `+243${d}` : null;
}

export const STATUTS = { EN_ATTENTE: "En attente", ACTIF: "Actif", SUSPENDU: "Suspendu" } as const;
export type StatutKey = keyof typeof STATUTS;

// Photos servies par la route protégée /gestion/photos
export const photoUrl = (rel: string) => `/gestion/photos/${rel.split("/").pop()}`;
