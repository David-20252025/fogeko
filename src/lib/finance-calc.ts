// Calculs financiers purs (testés) : toujours par devise, écritures annulées exclues, aucune conversion implicite
import type { DeviseKey } from "./money";

type Montant = { toString(): string } | number;
type Ecriture = { montant: Montant; devise: DeviseKey; annuleLe?: Date | null };
export type ParDevise = Record<DeviseKey, number>;
const zero = (): ParDevise => ({ USD: 0, CDF: 0 });
// Somme en centimes pour éviter les erreurs d'arrondi des nombres à virgule
const cents = (v: Montant) => Math.round(Number(v.toString()) * 100);

export function sommeParDevise(lignes: Ecriture[]): ParDevise {
  const c = zero();
  for (const l of lignes) if (!l.annuleLe) c[l.devise] += cents(l.montant);
  return { USD: c.USD / 100, CDF: c.CDF / 100 };
}

export function bilan(entrees: Ecriture[], sorties: Ecriture[]) {
  const e = sommeParDevise(entrees), s = sommeParDevise(sorties);
  return {
    entrees: e, sorties: s,
    solde: { USD: (cents(e.USD) - cents(s.USD)) / 100, CDF: (cents(e.CDF) - cents(s.CDF)) / 100 },
  };
}

/** Total converti en USD avec un taux saisi à la main (1 USD = taux CDF) ; null sans taux. */
export const convertiUsd = (v: ParDevise, taux?: number | null) => (taux && taux > 0 ? Math.round((v.USD + v.CDF / taux) * 100) / 100 : null);

/** Mois "2026-10" d'une date (UTC). */
export const moisDe = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

type Budget = { categorie: string; devise: DeviseKey; periode: "MENSUEL" | "ANNUEL"; montant: Montant };
type DepenseL = Ecriture & { categorie: string; date: Date };

/** Consommation de chaque budget sur sa période (mois ou année de la date de référence). */
export function suiviBudgets<B extends Budget>(budgets: B[], depenses: DepenseL[], ref: Date) {
  return budgets.map((b) => {
    const dans = depenses.filter((d) => d.categorie === b.categorie && d.devise === b.devise &&
      (b.periode === "MENSUEL" ? moisDe(d.date) === moisDe(ref) : d.date.getUTCFullYear() === ref.getUTCFullYear()));
    const depense = sommeParDevise(dans)[b.devise];
    const prevu = Number(b.montant.toString());
    return { ...b, prevu, depense, pourcentage: prevu > 0 ? Math.round((depense / prevu) * 100) : 0, depasse: depense > prevu };
  });
}

type Remunere = { id: number; montant: Montant; devise: DeviseKey; periodicite: "MENSUEL" | "TRIMESTRIEL" | "PONCTUEL"; debut: Date; actif: boolean };
type PaiementL = Ecriture & { remunereId: number; periode: string };

/** Dû pour ce mois ? Mensuel : chaque mois ; trimestriel : tous les 3 mois depuis le début ; ponctuel : jamais automatiquement. */
export function estDu(r: Remunere, periode: string) {
  const [y, m] = periode.split("-").map(Number);
  const ecart = (y - r.debut.getUTCFullYear()) * 12 + (m - 1 - r.debut.getUTCMonth());
  if (!r.actif || ecart < 0) return false;
  return r.periodicite === "MENSUEL" || (r.periodicite === "TRIMESTRIEL" && ecart % 3 === 0);
}

/** Vue « paiements du mois » : payés, non payés, total à payer et total payé par devise. */
export function paieDuMois<R extends Remunere>(remuneres: R[], paiements: PaiementL[], periode: string) {
  const lignes = remuneres.map((r) => {
    const payes = paiements.filter((p) => p.remunereId === r.id && p.periode === periode && !p.annuleLe);
    return { remunere: r, du: estDu(r, periode), paye: payes.length > 0, montantPaye: sommeParDevise(payes)[r.devise] };
  }).filter((l) => l.du || l.paye);
  const aPayer = zero(), paye = zero();
  for (const l of lignes) {
    if (l.du) aPayer[l.remunere.devise] += cents(l.remunere.montant);
    paye[l.remunere.devise] += cents(l.montantPaye);
  }
  return { lignes, aPayer: { USD: aPayer.USD / 100, CDF: aPayer.CDF / 100 }, paye: { USD: paye.USD / 100, CDF: paye.CDF / 100 } };
}
