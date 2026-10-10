import ExcelJS from "exceljs";
import { can, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero, STATUTS } from "@/lib/members";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || !can.export(user.role)) return new Response("Accès refusé", { status: 403 });

  const f = parseFilters(Object.fromEntries(new URL(req.url).searchParams));
  const members = await db.member.findMany({ where: memberWhere(f), include: { commune: true }, orderBy: { numero: "asc" } });

  const wb = new ExcelJS.Workbook();
  wb.creator = "FOGEKO";
  const ws = wb.addWorksheet("Membres", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "N° membre", key: "numero", width: 14 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Post-nom", key: "postNom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Sexe", key: "sexe", width: 7 },
    { header: "Date de naissance", key: "dateNaissance", width: 16, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Téléphone", key: "telephone", width: 16 },
    { header: "Email", key: "email", width: 26 },
    { header: "Commune", key: "commune", width: 16 },
    { header: "Quartier", key: "quartier", width: 18 },
    { header: "Profession", key: "profession", width: 20 },
    { header: "Catégorie", key: "categorie", width: 12 },
    { header: "Église / ministère", key: "eglise", width: 24 },
    { header: "Date d'adhésion", key: "dateAdhesion", width: 15, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Statut", key: "statut", width: 12 },
  ];
  for (const m of members)
    ws.addRow({
      numero: formatNumero(m.numero), nom: m.nom, postNom: m.postNom, prenom: m.prenom, sexe: m.sexe,
      dateNaissance: m.dateNaissance, telephone: m.telephone, email: m.email, commune: m.commune.nom, quartier: m.quartier,
      profession: m.profession, categorie: CATEGORIES[m.categorie], eglise: m.egliseMinistere, dateAdhesion: m.dateAdhesion, statut: STATUTS[m.statut],
    });
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A1360" } };
  ws.autoFilter = { from: "A1", to: "O1" };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(await wb.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="membres-fogeko-${date}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
