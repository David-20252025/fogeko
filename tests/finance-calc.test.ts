import assert from "node:assert/strict";
import { test } from "node:test";
import { bilan, convertiUsd, estDu, paieDuMois, sommeParDevise, suiviBudgets } from "../src/lib/finance-calc";

const d = (s: string) => new Date(`${s}T12:00:00Z`);

test("sommes par devise, sans mélanger USD et CDF, annulations exclues, sans erreur d'arrondi", () => {
  const s = sommeParDevise([
    { montant: "0.10", devise: "USD" }, { montant: "0.20", devise: "USD" },
    { montant: "15000", devise: "CDF" }, { montant: "999", devise: "USD", annuleLe: new Date() },
  ]);
  assert.deepEqual(s, { USD: 0.3, CDF: 15000 }); // 0.1 + 0.2 = 0.3 exactement
});

test("bilan : entrées moins sorties, par devise", () => {
  const b = bilan([{ montant: "500", devise: "USD" }, { montant: "100000", devise: "CDF" }], [{ montant: "120.50", devise: "USD" }]);
  assert.deepEqual(b.solde, { USD: 379.5, CDF: 100000 });
});

test("conversion uniquement avec un taux saisi", () => {
  assert.equal(convertiUsd({ USD: 100, CDF: 285000 }, 2850), 200);
  assert.equal(convertiUsd({ USD: 100, CDF: 5 }, null), null);
});

test("budgets : mensuel sur le mois, annuel sur l'année, alerte de dépassement", () => {
  const dep = [
    { montant: "60", devise: "USD" as const, categorie: "TRANSPORT", date: d("2026-10-03") },
    { montant: "50", devise: "USD" as const, categorie: "TRANSPORT", date: d("2026-10-20") },
    { montant: "40", devise: "USD" as const, categorie: "TRANSPORT", date: d("2026-09-20") },
    { montant: "500", devise: "USD" as const, categorie: "TRANSPORT", date: d("2026-10-21"), annuleLe: new Date() },
  ];
  const [m, a] = suiviBudgets([
    { categorie: "TRANSPORT", devise: "USD" as const, periode: "MENSUEL" as const, montant: "100" },
    { categorie: "TRANSPORT", devise: "USD" as const, periode: "ANNUEL" as const, montant: "1000" },
  ], dep, d("2026-10-25"));
  assert.equal(m.depense, 110); assert.equal(m.depasse, true); assert.equal(m.pourcentage, 110);
  assert.equal(a.depense, 150); assert.equal(a.depasse, false);
});

test("périodicité des rémunérations", () => {
  const base = { id: 1, montant: "200", devise: "USD" as const, debut: d("2026-01-01"), actif: true };
  assert.equal(estDu({ ...base, periodicite: "MENSUEL" }, "2026-05"), true);
  assert.equal(estDu({ ...base, periodicite: "MENSUEL" }, "2025-12"), false, "avant le début");
  assert.equal(estDu({ ...base, periodicite: "TRIMESTRIEL" }, "2026-04"), true);
  assert.equal(estDu({ ...base, periodicite: "TRIMESTRIEL" }, "2026-05"), false);
  assert.equal(estDu({ ...base, periodicite: "PONCTUEL" }, "2026-05"), false);
  assert.equal(estDu({ ...base, periodicite: "MENSUEL", actif: false }, "2026-05"), false);
});

test("paie du mois : payés, non payés, totaux par devise", () => {
  const r = [
    { id: 1, montant: "200", devise: "USD" as const, periodicite: "MENSUEL" as const, debut: d("2026-01-01"), actif: true },
    { id: 2, montant: "300000", devise: "CDF" as const, periodicite: "MENSUEL" as const, debut: d("2026-01-01"), actif: true },
  ];
  const v = paieDuMois(r, [
    { remunereId: 1, periode: "2026-10", montant: "200", devise: "USD" },
    { remunereId: 2, periode: "2026-10", montant: "300000", devise: "CDF", annuleLe: new Date() }, // annulé : pas payé
  ], "2026-10");
  assert.deepEqual(v.lignes.map((l) => [l.remunere.id, l.paye]), [[1, true], [2, false]]);
  assert.deepEqual(v.aPayer, { USD: 200, CDF: 300000 });
  assert.deepEqual(v.paye, { USD: 200, CDF: 0 });
});
