import { readFileSync } from "node:fs";
import path from "node:path";
import pdfmake from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { convertiUsd, sommeParDevise } from "./finance-calc";
import { DEVISES, formatMontant, type DeviseKey } from "./money";

const NAVY = "#0A1360";
const ROUGE = "#EC2A45";
const GRIS = "#5f6177";
const DEV = Object.keys(DEVISES) as DeviseKey[];

// Polices intégrées au PDF (accents français corrects), chargées une seule fois
const fontDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto");
let pret = false;
function init() {
  if (pret) return;
  pdfmake.setFonts({
    Roboto: {
      normal: path.join(fontDir, "Roboto-Regular.ttf"),
      bold: path.join(fontDir, "Roboto-Medium.ttf"),
      italics: path.join(fontDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
    },
  });
  // Aucune ressource distante ; seules les polices locales sont lues
  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((p: string) => path.resolve(p).startsWith(fontDir));
  pret = true;
}
const logo = () => `data:image/png;base64,${readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "img", "logo.png")).toString("base64")}`;

export type LigneRapport = {
  date: Date; type: string; libelle: string; categorie?: string; sens: 1 | -1;
  montant: { toString(): string } | number; devise: DeviseKey; annuleLe?: Date | null;
};
export type RapportData = {
  titre: string; periode: string; generePar: string; adresse: string | null | undefined;
  filtres?: string; taux?: number | null; lignes: LigneRapport[];
};

export class RapportError extends Error {}

// Les espaces insécables fines du format français n'existent pas dans la police : espace normal à la place
const nb = (t: string) => t.replace(/[  ]/g, " ");
const fmt = (v: number, d: DeviseKey) => nb(formatMontant(v, d));
const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

/** Barres horizontales (montants par libellé), lisibles en noir et blanc grâce aux valeurs écrites. */
function barres(titre: string, data: { label: string; v: number }[], devise: DeviseKey): Content {
  if (!data.length) return [];
  const max = Math.max(...data.map((x) => x.v), 1);
  const W = 260;
  return {
    unbreakable: true, margin: [0, 6, 0, 12],
    stack: [
      { text: titre, style: "h3" },
      ...data.map((x) => ({
        columns: [
          { width: 120, text: x.label, fontSize: 9, margin: [0, 2, 0, 0] },
          { width: W + 10, canvas: [{ type: "rect", x: 0, y: 2, w: Math.max(2, (x.v / max) * W), h: 10, color: NAVY }] },
          { width: "*", text: fmt(x.v, devise), fontSize: 9, bold: true, margin: [0, 2, 0, 0] },
        ],
        margin: [0, 2, 0, 0],
      })) as Content[],
    ],
  };
}

function tableau(titre: string, lignes: LigneRapport[]): Content {
  if (!lignes.length) return { text: [{ text: `${titre} : `, bold: true }, "aucune écriture."], margin: [0, 6, 0, 10] };
  return [
    { text: titre, style: "h2" },
    {
      table: {
        headerRows: 1, widths: [52, 70, "*", 80, 78],
        body: [
          ["Date", "Type", "Libellé", "Catégorie", { text: "Montant", alignment: "right" }].map((t) => (typeof t === "string" ? { text: t, style: "th" } : { ...t, style: "th" })),
          ...lignes.map((l) => [
            dateFr(l.date), l.type, l.libelle, l.categorie ?? "",
            { text: fmt(Number(l.montant.toString()), l.devise), alignment: "right", noWrap: true },
          ]),
        ],
      },
      layout: { hLineWidth: (i: number) => (i <= 1 ? 1 : 0.4), vLineWidth: () => 0, hLineColor: (i: number) => (i <= 1 ? NAVY : "#c8cad6"), paddingTop: () => 4, paddingBottom: () => 4 },
      fontSize: 8.5, margin: [0, 0, 0, 12],
    } as Content,
  ];
}

type Entete = { titre: string; periode: string; generePar: string; adresse: string; paysage?: boolean };

/** Document FOGEKO : en-tête (logo, titre), filigrane du logo, pied de page (adresse, Page x / y, généré par) sur chaque page. */
function documentPdf(e: Entete, content: Content[]): Promise<Buffer> {
  init();
  const genereLe = nb(new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Kinshasa" }));
  const doc: TDocumentDefinitions = {
    pageSize: "A4", pageOrientation: e.paysage ? "landscape" : "portrait", pageMargins: [40, 92, 40, 64],
    images: { logo: logo() }, // déclaré une fois, réutilisé sur chaque page
    info: { title: `${e.titre} — ${e.periode}`, author: "Fondation Gekoko (FOGEKO)", creator: "FOGEKO" },
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#14173A", lineHeight: 1.15 },
    styles: {
      h1: { fontSize: 15, bold: true, color: NAVY },
      h2: { fontSize: 12, bold: true, color: NAVY, margin: [0, 10, 0, 6] },
      h3: { fontSize: 10, bold: true, color: NAVY, margin: [0, 0, 0, 4] },
      th: { bold: true, color: NAVY, fontSize: 8.5 },
      petit: { fontSize: 8, color: GRIS },
    },
    // Filigrane : le logo en grand, centré, très léger, sur chaque page
    background: (_page, size) => ({ image: "logo", width: 380, opacity: 0.07, absolutePosition: { x: (size.width - 380) / 2, y: (size.height - 294) / 2 } }),
    header: (_page, _pages, size) => ({
      margin: [40, 24, 40, 0],
      stack: [
        {
          columns: [
            { image: "logo", width: 62 },
            { width: "*", margin: [12, 6, 0, 0], stack: [{ text: e.titre, style: "h1" }, { text: e.periode, fontSize: 10, color: GRIS }] },
            { width: 150, alignment: "right", margin: [0, 8, 0, 0], stack: [{ text: "Fondation Gekoko (FOGEKO)", bold: true, fontSize: 8.5, color: NAVY }, { text: `Généré le ${genereLe}`, style: "petit" }] },
          ],
        },
        { canvas: [{ type: "line", x1: 0, y1: 6, x2: size.width - 80, y2: 6, lineWidth: 1.5, lineColor: ROUGE }] },
      ],
    }),
    footer: (page, pages, size) => ({
      margin: [40, 18, 40, 0],
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: size.width - 80, y2: 0, lineWidth: 0.6, lineColor: NAVY }] },
        {
          margin: [0, 5, 0, 0], fontSize: 7.5, color: GRIS,
          columns: [
            { width: "*", text: e.adresse.replace(/\s*\n\s*/g, " · ") },
            { width: 70, alignment: "center", text: `Page ${page} / ${pages}`, bold: true, color: NAVY },
            { width: "*", alignment: "right", text: `Généré par ${e.generePar}` },
          ],
        },
      ],
    }),
    content,
  };
  return pdfmake.createPdf(doc).getBuffer();
}

/** Rapport financier : synthèse par devise, sorties par catégorie, détail, signatures. */
export async function rapportFinancierPdf(d: RapportData): Promise<Buffer> {
  if (!d.adresse?.trim()) throw new RapportError("L'adresse de la fondation n'est pas renseignée : complétez-la dans Administration → Paramètres avant de générer un rapport.");
  const valides = d.lignes.filter((l) => !l.annuleLe);
  const entrees = valides.filter((l) => l.sens === 1), sorties = valides.filter((l) => l.sens === -1);
  const E = sommeParDevise(entrees), S = sommeParDevise(sorties);
  const annulees = d.lignes.length - valides.length;
  const parCategorie = (dev: DeviseKey) => {
    const m = new Map<string, number>();
    for (const l of sorties.filter((x) => x.devise === dev)) m.set(l.categorie ?? l.type, (m.get(l.categorie ?? l.type) ?? 0) + Number(l.montant.toString()));
    return [...m].map(([label, v]) => ({ label, v: Math.round(v * 100) / 100 })).sort((a, b) => b.v - a.v);
  };
  const solde = { USD: E.USD - S.USD, CDF: E.CDF - S.CDF };

  return documentPdf({ titre: d.titre, periode: d.periode, generePar: d.generePar, adresse: d.adresse }, [
      ...(d.filtres ? [{ text: `Filtres : ${d.filtres}`, style: "petit", margin: [0, 0, 0, 6] } as Content] : []),
      { text: "Synthèse", style: "h2" },
      {
        table: {
          headerRows: 1, widths: ["*", 110, 110, 110],
          body: [
            ["Devise", "Entrées", "Sorties", "Solde"].map((t, i) => ({ text: t, style: "th", alignment: i ? "right" : "left" })),
            ...DEV.map((dev) => [
              { text: DEVISES[dev], bold: true },
              { text: fmt(E[dev], dev), alignment: "right" },
              { text: fmt(S[dev], dev), alignment: "right" },
              { text: fmt(solde[dev], dev), alignment: "right", bold: true },
            ]),
          ],
        },
        layout: { hLineWidth: () => 0.6, vLineWidth: () => 0, hLineColor: () => NAVY, paddingTop: () => 5, paddingBottom: () => 5 },
      } as Content,
      d.taux
        ? { text: `Solde converti en USD au taux saisi (1 USD = ${nb(d.taux.toLocaleString("fr-FR"))} CDF) : ${fmt(convertiUsd(solde, d.taux)!, "USD")}. Les montants restent présentés dans leur devise d'origine.`, style: "petit", margin: [0, 4, 0, 0] }
        : { text: "Aucune conversion entre devises : USD et CDF sont présentés séparément.", style: "petit", margin: [0, 4, 0, 0] },
      annulees ? { text: `${annulees} écriture(s) annulée(s) exclue(s) des totaux (motifs consultables dans l'historique).`, style: "petit", margin: [0, 2, 0, 0] } : [],
      { text: "Sorties par catégorie", style: "h2" },
      ...DEV.map((dev) => barres(DEVISES[dev], parCategorie(dev), dev)),
      tableau("Détail des entrées", entrees),
      tableau("Détail des sorties", sorties),
      {
        unbreakable: true, margin: [0, 24, 0, 0],
        columns: ["Le Trésorier", "Le Super admin"].map((r) => ({
          stack: [
            { text: r, bold: true, color: NAVY },
            { text: "Nom :", margin: [0, 12, 0, 0] }, { text: "Date :", margin: [0, 8, 0, 0] },
            { text: "Signature :", margin: [0, 8, 0, 0] },
            { canvas: [{ type: "rect", x: 0, y: 4, w: 200, h: 48, lineColor: "#9a9cb0", lineWidth: 0.6 }] },
          ],
        })),
      },
  ]);
}

export type LigneMembre = {
  numero: string; nomComplet: string; sexe: string; telephone: string; categorie: string;
  commune: string; quartier: string; profession: string; adhesion: Date; statut: string;
};

/** Liste des membres (A4 paysage) : mêmes en-tête, filigrane et pied de page que les rapports. */
export function listeMembresPdf(d: { filtres: string; generePar: string; adresse: string; membres: LigneMembre[] }): Promise<Buffer> {
  const entetes = ["N°", "Nom complet", "Sexe", "Téléphone", "Catégorie", "Commune", "Quartier", "Profession", "Adhésion", "Statut"];
  return documentPdf({ titre: "Liste des membres", periode: `${d.filtres} — ${d.membres.length} membre(s)`, generePar: d.generePar, adresse: d.adresse, paysage: true }, [
    { text: "Document confidentiel : données personnelles des membres.", style: "petit", margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1, widths: [58, "*", 26, 74, 52, 62, 70, 80, 50, 50],
        body: [
          entetes.map((t) => ({ text: t, style: "th" })),
          ...d.membres.map((m) => [{ text: m.numero, bold: true, noWrap: true }, m.nomComplet, m.sexe, { text: m.telephone, noWrap: true }, m.categorie, m.commune, m.quartier, m.profession, dateFr(m.adhesion), m.statut]),
        ],
      },
      layout: { hLineWidth: (i: number) => (i <= 1 ? 1 : 0.4), vLineWidth: () => 0, hLineColor: (i: number) => (i <= 1 ? NAVY : "#c8cad6"), fillColor: (i: number) => (i > 0 && i % 2 === 0 ? "#f1f2f8" : null), paddingTop: () => 3, paddingBottom: () => 3 },
      fontSize: 8,
    } as Content,
  ]);
}
