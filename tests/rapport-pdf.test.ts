import assert from "node:assert/strict";
import { test } from "node:test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { listeMembresPdf, rapportFinancierPdf, RapportError, type LigneRapport } from "../src/lib/rapport-pdf";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
// Données fictives : assez de lignes pour plusieurs pages
const lignes: LigneRapport[] = [
  { date: d("2026-10-02"), type: "Don", libelle: "REC-2026-0001 · Donateur fictif", sens: 1, montant: "500", devise: "USD" },
  { date: d("2026-10-03"), type: "Don", libelle: "REC-2026-0002 · Don annulé", sens: 1, montant: "9999", devise: "USD", annuleLe: d("2026-10-04") },
  { date: d("2026-10-05"), type: "Don", libelle: "REC-2026-0003 · Pasteur fictif", sens: 1, montant: "250000", devise: "CDF" },
  ...Array.from({ length: 60 }, (_, i): LigneRapport => ({ date: d("2026-10-06"), type: "Dépense", libelle: `Dépense fictive n° ${i + 1} — événement à Limete`, categorie: i % 2 ? "Transport" : "Événement", sens: -1, montant: "2.50", devise: "USD" })),
];

async function texte(buf: Buffer) {
  const pdf = await getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map((x) => ("str" in x ? x.str : "")).join(" "));
  return pages;
}

test("rapport PDF : en-tête, pied de page sur chaque page, accents, totaux sans les annulations", async () => {
  const buf = await rapportFinancierPdf({ titre: "Rapport financier", periode: "Octobre 2026", generePar: "Testeur Fictif", adresse: "Avenue fictive 1, Limete, Kinshasa", lignes });
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  const pages = await texte(buf);
  assert.ok(pages.length >= 2, `plusieurs pages (${pages.length})`);
  pages.forEach((p, i) => {
    assert.match(p, new RegExp(`Page ${i + 1} / ${pages.length}`), `numéro de page ${i + 1}`);
    assert.match(p, /Généré par Testeur Fictif/);
    assert.match(p, /Avenue fictive 1, Limete, Kinshasa/);
    assert.match(p, /Rapport financier/);
  });
  const tout = pages.join(" ");
  assert.match(tout, /Synthèse/); assert.match(tout, /Événement/); assert.match(tout, /Le Trésorier/); assert.match(tout, /Le Super admin/);
  assert.match(tout, /500,00/, "entrées USD = 500 (le don annulé de 9 999 est exclu)");
  assert.doesNotMatch(tout, /10\s?499/, "le don annulé n'est pas compté");
  assert.match(tout, /150,00/, "sorties USD = 60 × 2,50");
});

test("adresse manquante : message clair, pas de PDF", async () => {
  await assert.rejects(
    rapportFinancierPdf({ titre: "R", periode: "P", generePar: "X", adresse: "  ", lignes: [] }),
    (e) => e instanceof RapportError && /Paramètres/.test(e.message),
  );
});

test("liste des membres PDF : A4 paysage, en-tête et pied de page sur chaque page, toutes les lignes", async () => {
  const membres = Array.from({ length: 70 }, (_, i) => ({
    numero: `FOGEKO-${String(i + 1).padStart(4, "0")}`, nomComplet: `Membre Fictif ${i + 1}`, sexe: "F", telephone: "+243890000000",
    categorie: "Mamans", commune: "Limete", quartier: "Kingabwa", profession: "Commerçante", adhesion: d("2026-10-01"), statut: "Actif",
  }));
  const buf = await listeMembresPdf({ filtres: "Tous les membres", generePar: "Testeur Fictif", adresse: "Avenue fictive 1, Limete", membres });
  const pdf = await getDocument({ data: new Uint8Array(buf) }).promise;
  const page1 = await pdf.getPage(1);
  const [, , w, h] = page1.view;
  assert.ok(w > h, "paysage");
  const pages = await texte(buf);
  assert.ok(pages.length >= 2, `plusieurs pages (${pages.length})`);
  pages.forEach((p, i) => {
    assert.match(p, new RegExp(`Page ${i + 1} / ${pages.length}`));
    assert.match(p, /Liste des membres/);
    assert.match(p, /Généré par Testeur Fictif/);
  });
  const tout = pages.join(" ");
  assert.match(tout, /70 membre\(s\)/);
  assert.match(tout, /FOGEKO-0001/); assert.match(tout, /FOGEKO-0070/);
});
