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

export type CarteMembre = {
  nomComplet: string; numero: string; categorie: string; commune: string; telephone: string; depuis: string;
  qr: string; photo: string | null; initiales: string; // photo : image JPEG déjà recadrée (data URL), null si absente
};

const MM = 72 / 25.4;
const CW = 85.6 * MM, CH = 54 * MM; // format carte bancaire ISO/CR80
const OCRE = "#c9892b"; // --color-ocre du site
const boite = (x: number, y: number, w: number, contenu: Content): Content =>
  ({ absolutePosition: { x, y }, table: { widths: [w], body: [[contenu]] }, layout: { defaultBorder: false, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 } }) as Content;

// Bande décorative inspirée des motifs kuba (même dessin que .kuba du site), répétée sur la largeur de la carte
const tuile = `<path d='M0 7 7 0l7 7-7 7z' fill='${NAVY}'/><path d='M7 4l3 3-3 3-3-3z' fill='${ROUGE}'/><path d='M16 0h10v4h-6v6h6v4H16z' fill='${NAVY}'/><path d='M30 0h10v10h-6V4h-4zM30 14v-4h4v4z' fill='${NAVY}'/><rect x='44' y='0' width='4' height='14' fill='${ROUGE}'/><rect x='50' y='5' width='4' height='4' fill='${NAVY}'/>`;
const kuba = `<svg xmlns='http://www.w3.org/2000/svg' width='952' height='14' viewBox='0 0 952 14'><rect width='952' height='14' fill='${OCRE}'/>${Array.from({ length: 17 }, (_, i) => `<g transform='translate(${i * 56} 0)'>${tuile}</g>`).join("")}</svg>`;

function carte(c: CarteMembre, x: number, y: number, bordure: boolean): Content[] {
  const corpsY = y + 12.3 * MM, corpsH = CH - 12.3 * MM - 4 * MM;
  const photoY = corpsY + (corpsH - 22 * MM) / 2;
  const qrY = corpsY + (corpsH - 18 * MM) / 2;
  const texteX = x + 27.5 * MM, texteW = CW - 27.5 * MM - 3 * MM - 15 * MM - 2.5 * MM;
  const info = (l: string, v: string) => [{ text: l, color: GRIS }, { text: v, bold: true }];
  return [
    ...(bordure ? [{ absolutePosition: { x, y }, canvas: [{ type: "rect", x: 0, y: 0, w: CW, h: CH, r: 3 * MM, lineColor: "#c3c6d8", lineWidth: 0.5 }] } as Content] : []),
    { image: "logo", height: 9.5 * MM, width: (9.5 * 600) / 464 * MM, absolutePosition: { x: x + 3 * MM, y: y + 0.75 * MM } },
    boite(x + 3 * MM, y + 2.4 * MM, CW - 6 * MM, { alignment: "right", stack: [{ text: "Fondation Gekoko", bold: true, fontSize: 8, color: NAVY }, { text: "CARTE DE MEMBRE", bold: true, fontSize: 5.8, color: ROUGE, characterSpacing: 1 }] }),
    { svg: kuba, width: CW, height: 1.3 * MM, absolutePosition: { x, y: y + 11 * MM } },
    c.photo
      ? { image: c.photo, width: 22 * MM, height: 22 * MM, absolutePosition: { x: x + 3 * MM, y: photoY } }
      : { absolutePosition: { x: x + 3 * MM, y: photoY }, canvas: [{ type: "rect", x: 0, y: 0, w: 22 * MM, h: 22 * MM, r: 2 * MM, color: "#eef0f7" }] },
    ...(c.photo ? [] : [boite(x + 3 * MM, photoY + 8.5 * MM, 22 * MM, { text: c.initiales, alignment: "center", bold: true, fontSize: 14, color: NAVY })]),
    { absolutePosition: { x: x + 3 * MM, y: photoY }, canvas: [{ type: "rect", x: 0, y: 0, w: 22 * MM, h: 22 * MM, r: 2 * MM, lineColor: OCRE, lineWidth: 1.7 }] },
    boite(texteX, corpsY + 1.5 * MM, texteW, {
      stack: [
        { text: c.nomComplet, bold: true, fontSize: 8.5, color: NAVY, lineHeight: 1 },
        { text: c.numero, bold: true, fontSize: 8.5, color: ROUGE, margin: [0, 2, 0, 2] },
        { table: { widths: ["auto", "*"], body: [info("Catégorie", c.categorie), info("Commune", c.commune), info("Tél.", c.telephone), info("Depuis", c.depuis)] }, layout: { defaultBorder: false, paddingLeft: () => 0, paddingRight: () => 3, paddingTop: () => 0.4, paddingBottom: () => 0.4 }, fontSize: 6 },
      ],
    }),
    { qr: c.qr, fit: 15 * MM, foreground: NAVY, absolutePosition: { x: x + CW - 18 * MM, y: qrY } } as Content,
    boite(x + CW - 18 * MM, qrY + 15.6 * MM, 15 * MM, { text: "Vérification", fontSize: 4.5, color: GRIS, alignment: "center" }),
    { absolutePosition: { x, y: y + CH - 4 * MM }, canvas: [{ type: "rect", x: 0, y: 0, w: CW, h: 4 * MM, color: NAVY }] },
    boite(x + 3 * MM, y + CH - 2.9 * MM, CW - 6 * MM, { columns: [{ text: "Kinshasa · République démocratique du Congo" }, { text: "fogeko.com", alignment: "right" }], fontSize: 5, color: "#ffffff" }),
  ];
}

/** Cartes de membre en PDF : cr80 = une carte par page au format exact, a4 = planche de 10 cartes à découper. */
export function cartesPdf(cartes: CarteMembre[], format: "cr80" | "a4"): Promise<Buffer> {
  init();
  const parPage = format === "a4" ? 10 : 1;
  const content: Content[] = [];
  cartes.forEach((c, i) => {
    if (i > 0 && i % parPage === 0) content.push({ text: "", pageBreak: "before" });
    const k = i % parPage;
    const [x, y] = format === "a4" ? [10 * MM + (k % 2) * (CW + 5 * MM), 7 * MM + Math.floor(k / 2) * (CH + 3 * MM)] : [0, 0];
    content.push(...carte(c, x, y, format === "a4"));
  });
  if (!cartes.length) content.push({ text: "Aucun membre sélectionné.", margin: [20, 20] });
  return pdfmake.createPdf({
    pageSize: format === "a4" ? "A4" : { width: CW, height: CH }, pageMargins: [0, 0, 0, 0],
    images: { logo: logo() }, info: { title: "Cartes de membre FOGEKO", author: "Fondation Gekoko (FOGEKO)", creator: "FOGEKO" },
    defaultStyle: { font: "Roboto", fontSize: 8, color: "#14173A" }, content,
  }).getBuffer();
}
