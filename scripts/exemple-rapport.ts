// Génère un rapport financier d'EXEMPLE avec des données fictives : npx tsx scripts/exemple-rapport.ts [fichier.pdf]
import { writeFileSync } from "node:fs";
import { rapportFinancierPdf, type LigneRapport } from "../src/lib/rapport-pdf";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const don = (date: string, libelle: string, montant: string, devise: "USD" | "CDF"): LigneRapport => ({ date: d(date), type: "Don", libelle, sens: 1, montant, devise });
const dep = (date: string, libelle: string, categorie: string, montant: string, devise: "USD" | "CDF"): LigneRapport => ({ date: d(date), type: "Dépense", libelle, categorie, sens: -1, montant, devise });

const lignes: LigneRapport[] = [
  { date: d("2026-10-01"), type: "Fonds", libelle: "Fonds mensuel d'octobre (exemple)", sens: 1, montant: "2000", devise: "USD" },
  don("2026-10-03", "REC-2026-0001 · Donateur externe (exemple)", "500", "USD"),
  don("2026-10-05", "REC-2026-0002 · Pasteur Exemple — Église fictive", "250000", "CDF"),
  don("2026-10-09", "REC-2026-0003 · Membre FOGEKO-0012 (exemple)", "75", "USD"),
  { ...don("2026-10-10", "REC-2026-0004 · Saisie en double (exemple)", "75", "USD"), annuleLe: d("2026-10-10") },
  don("2026-10-14", "REC-2026-0005 · Anonyme", "120000", "CDF"),
  dep("2026-10-04", "Distribution de vivres à Kingabwa", "Action sociale", "640", "USD"),
  dep("2026-10-06", "Location de chaises — réunion des mamans", "Événement", "180000", "CDF"),
  dep("2026-10-08", "Transport des bénévoles", "Transport", "45", "USD"),
  dep("2026-10-11", "Impression de banderoles", "Communication", "95000", "CDF"),
  dep("2026-10-12", "Crédit internet et téléphone", "Fonctionnement", "30", "USD"),
  dep("2026-10-15", "Transport des bénévoles", "Transport", "38", "USD"),
  { date: d("2026-10-25"), type: "Paiement", libelle: "BOR-2026-0001 · Coordinateur de terrain (exemple)", categorie: "Rémunérations", sens: -1, montant: "200", devise: "USD" },
  { date: d("2026-10-25"), type: "Paiement", libelle: "BOR-2026-0002 · Agent de communication (exemple)", categorie: "Rémunérations", sens: -1, montant: "150000", devise: "CDF" },
];

const sortie = process.argv[2] ?? "exemple-rapport-financier.pdf";
rapportFinancierPdf({
  titre: "Rapport financier mensuel", periode: "Octobre 2026 — EXEMPLE, données fictives",
  generePar: "Super administrateur", adresse: "Avenue de la Fondation n° 1, Kingabwa, Limete, Kinshasa — RDC (adresse d'exemple)",
  filtres: "toutes les écritures, USD et CDF", taux: 2850, lignes,
}).then((buf) => { writeFileSync(sortie, buf); console.log(`${sortie} (${Math.round(buf.length / 1024)} Ko)`); });
