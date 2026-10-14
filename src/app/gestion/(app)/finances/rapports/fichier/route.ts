import ExcelJS from "exceljs";
import { audit } from "@/lib/audit";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { lignesFinance, parseFiltresFinance, TYPES } from "@/lib/finance-lignes";
import { CATEGORIES_DEPENSE, DEVISES } from "@/lib/money";
import { rapportFinancierPdf, RapportError } from "@/lib/rapport-pdf";
import { getSettings } from "@/lib/settings";

const jour = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "UTC" });

// Rapport financier filtré : PDF (par défaut) ou Excel (?format=xlsx) — permission Finances « exporter »
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  if (!user.perms.FINANCES.exporter) return new Response("Accès refusé", { status: 403 });

  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseFiltresFinance(sp);
  const excel = sp.format === "xlsx";
  const tauxSaisi = Number(String(sp.taux ?? "").replace(/\s/g, "").replace(",", "."));
  const taux = tauxSaisi > 0 && tauxSaisi < 1_000_000 ? tauxSaisi : null;
  const [lignes, params, site] = await Promise.all([lignesFinance(f), db.parametres.findUnique({ where: { id: 1 } }), getSettings()]);
  const periode = `Du ${jour(f.du)} au ${jour(f.au)}`;
  const filtres = [f.type ? TYPES[f.type] : "toutes les écritures", f.devise ? DEVISES[f.devise] : "USD et CDF", f.categorie && CATEGORIES_DEPENSE[f.categorie]].filter(Boolean).join(", ");
  const nom = `rapport-financier-${f.du.toISOString().slice(0, 10)}-${f.au.toISOString().slice(0, 10)}`;
  const entetes = (type: string, fichier: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${fichier}"`,
    "Cache-Control": "private, no-store",
  });

  if (excel) {
    const wb = new ExcelJS.Workbook();
    wb.creator = "FOGEKO";
    const ws = wb.addWorksheet("Écritures", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
      { header: "Date", key: "date", width: 12, style: { numFmt: "dd/mm/yyyy" } },
      { header: "Type", key: "type", width: 16 },
      { header: "Libellé", key: "libelle", width: 44 },
      { header: "Catégorie", key: "categorie", width: 18 },
      { header: "Entrée", key: "entree", width: 14, style: { numFmt: "#,##0.00" } },
      { header: "Sortie", key: "sortie", width: 14, style: { numFmt: "#,##0.00" } },
      { header: "Devise", key: "devise", width: 8 },
      { header: "Saisi par", key: "auteur", width: 20 },
      { header: "Statut", key: "statut", width: 34 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const l of lignes) {
      const m = Number(l.montant.toString());
      ws.addRow({
        date: l.date, type: TYPES[l.type], libelle: l.libelle, categorie: l.categorie ?? "",
        entree: l.sens === 1 ? m : null, sortie: l.sens === -1 ? m : null, devise: l.devise, auteur: l.auteur,
        statut: l.annuleLe ? `Annulée le ${jour(l.annuleLe)} : ${l.motif ?? ""}` : "Valide",
      });
    }
    await audit(user.id, "rapport.export", "Finances", undefined, { format: "xlsx", periode, filtres, lignes: lignes.length });
    return new Response(new Uint8Array(await wb.xlsx.writeBuffer()), { headers: entetes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${nom}.xlsx`) });
  }

  try {
    const pdf = await rapportFinancierPdf({
      titre: "Rapport financier", periode, generePar: user.name, adresse: params?.adresseFondation || site.adresse, filtres, // à défaut, l'adresse publique du site
      taux: taux ?? (params?.tauxUsdCdf ? Number(params.tauxUsdCdf) : null),
      lignes: [...lignes].reverse().map((l) => ({ date: l.date, type: TYPES[l.type], libelle: l.libelle, categorie: l.categorie, sens: l.sens, montant: l.montant, devise: l.devise, annuleLe: l.annuleLe })),
    });
    await audit(user.id, "rapport.export", "Finances", undefined, { format: "pdf", periode, filtres, lignes: lignes.length });
    return new Response(new Uint8Array(pdf), { headers: entetes("application/pdf", `${nom}.pdf`) });
  } catch (e) {
    if (e instanceof RapportError) return new Response(e.message, { status: 422, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    throw e;
  }
}
