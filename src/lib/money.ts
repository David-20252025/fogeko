export const DEVISES = { USD: "Dollar (USD)", CDF: "Franc congolais (CDF)" } as const;
export type DeviseKey = keyof typeof DEVISES;
export const MOYENS = { ESPECES: "Espèces", MOBILE_MONEY: "Mobile money", VIREMENT: "Virement bancaire", AUTRE: "Autre" } as const;

/** « 1 500,50 », « 1500.5 », « 2 000 » → "1500.50" (chaîne exacte pour Decimal) ; null si invalide, nul ou négatif. */
export function parseMontant(raw: string): string | null {
  const t = raw.replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  const v = `${BigInt(ent)}.${dec.padEnd(2, "0")}`;
  return /^0\.00$/.test(v) ? null : v;
}

export const formatMontant = (v: { toString(): string } | number, devise: DeviseKey) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: devise, minimumFractionDigits: devise === "CDF" ? 0 : 2 }).format(Number(v.toString()));

/** "2026-10" → 1er octobre 2026 à minuit UTC (clé du fonds mensuel) ; null si invalide. */
export function moisDebut(raw: string): Date | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : null;
}

export const moisCle = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const moisLabel = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
