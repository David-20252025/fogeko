import sharp from "sharp";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero } from "@/lib/members";
import { cartesPdf } from "@/lib/rapport-pdf";
import { readUpload } from "@/lib/storage";

// Photo carrée aux coins arrondis, fond blanc, en JPEG : légère dans le PDF (pdfmake ne lit pas le WebP)
const MASQUE = Buffer.from(`<svg width="260" height="260"><rect width="260" height="260" rx="24" ry="24"/></svg>`);
async function photoCarte(rel: string) {
  const buf = await readUpload("membres", [rel.split("/").pop()!]);
  if (!buf) return null;
  const png = await sharp(buf).resize(260, 260, { fit: "cover" }).composite([{ input: MASQUE, blend: "dest-in" }]).png().toBuffer();
  return `data:image/jpeg;base64,${(await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer()).toString("base64")}`;
}

// Cartes de membre téléchargées en PDF. format=cr80 (une carte par page, 85,6 × 54 mm) ou a4 (planche de 10).
// ?id=…&id=… pour une sélection, sinon les filtres de la liste des membres. 500 cartes au plus.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  if (!user.perms.MEMBRES.exporter) return new Response("Accès refusé", { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "cr80" ? "cr80" : "a4";
  const ids = url.searchParams.getAll("id").slice(0, 500);
  const where = ids.length ? { id: { in: ids } } : memberWhere(parseFilters(Object.fromEntries(url.searchParams)));
  const members = await db.member.findMany({ where, include: { commune: true }, orderBy: { numero: "asc" }, take: 500 });
  const site = process.env.SITE_URL ?? "https://fogeko.com";

  const pdf = await cartesPdf(await Promise.all(members.map(async (m) => ({
    nomComplet: [m.prenom, m.nom, m.postNom].filter(Boolean).join(" "),
    numero: formatNumero(m.numero), categorie: CATEGORIES[m.categorie], commune: `${m.commune.nom} · ${m.quartier}`, telephone: m.telephone,
    depuis: m.dateAdhesion.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    // Le QR mène à la fiche dans l'espace de gestion : seule l'équipe connectée peut la consulter
    qr: `${site}/gestion/membres/${m.id}`,
    photo: await photoCarte(m.photo).catch(() => null),
    initiales: `${m.prenom[0] ?? ""}${m.nom[0] ?? ""}`.toUpperCase(),
  }))), format);

  const nom = members.length === 1 ? `carte-${formatNumero(members[0].numero)}` : `cartes-fogeko-${format}-${new Date().toISOString().slice(0, 10)}`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nom}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
