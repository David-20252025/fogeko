import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { AutoPrint } from "@/components/admin/auto-print";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero, photoUrl } from "@/lib/members";

// Format carte bancaire ISO/CR80 : 85,6 × 54 mm.
// format=cr80 → une carte par page de la taille exacte (imprimante à cartes, PDF carte par carte)
// format=a4 (défaut) → planche A4 de 10 cartes à découper. ?id=…&id=… pour une sélection, sinon les filtres de la liste.
const PAGE_CSS = {
  cr80: "@page { size: 85.6mm 54mm; margin: 0 } .carte { break-after: page; border: 0 !important; border-radius: 0 !important }",
  a4: "@page { size: A4 portrait; margin: 7mm 10mm }",
};

export default async function PrintCards(props: PageProps<"/gestion/impression/cartes">) {
  await requirePerm("MEMBRES", "exporter");
  const sp = await props.searchParams;
  const format = sp.format === "cr80" ? "cr80" : "a4";
  const ids = ([] as string[]).concat(sp.id ?? []).slice(0, 500);
  const where = ids.length ? { id: { in: ids } } : memberWhere(parseFilters(sp));
  const [members, total] = await Promise.all([
    db.member.findMany({ where, include: { commune: true }, orderBy: { numero: "asc" }, take: 500 }),
    db.member.count({ where }),
  ]);
  const site = process.env.SITE_URL ?? "https://fogeko.com";
  // Le QR mène à la fiche dans l'espace de gestion : seule l'équipe connectée peut la consulter
  const qrs = await Promise.all(members.map((m) => QRCode.toString(`${site}/gestion/membres/${m.id}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0A1360", light: "#0000" } })));
  const autreFormat = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (k === "format" ? [] : ([] as string[]).concat(v ?? []).map((x) => [k, x]))));
  autreFormat.set("format", format === "a4" ? "cr80" : "a4");

  return (
    <div className={`mx-auto bg-white ${format === "a4" ? "max-w-[210mm] p-[7mm_10mm]" : "max-w-[100mm] p-4"} print:max-w-none print:p-0`}>
      <style>{`${PAGE_CSS[format]} body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }`}</style>

      <div className="mb-5 rounded-xl bg-mist p-3 text-sm text-ink print:hidden">
        <p className="font-semibold text-navy">
          {members.length} carte{members.length > 1 ? "s" : ""} · {format === "cr80" ? "format carte CR80 (85,6 × 54 mm), une par page" : "planche A4, 10 cartes à découper"}
        </p>
        <p className="mt-1">
          Dans la fenêtre d&apos;impression : <strong>Destination « Enregistrer au format PDF »</strong> pour un PDF, marges <strong>Aucune</strong>, échelle <strong>100 %</strong>.{" "}
          <Link href={`?${autreFormat}`} className="font-semibold text-navy underline">Passer en {format === "a4" ? "format CR80" : "planche A4"}</Link>
        </p>
        {total > members.length && <p className="mt-1 font-semibold text-rouge-600">{total} membres correspondent : seules les 500 premières cartes sont affichées.</p>}
      </div>

      <div className={format === "a4" ? "grid grid-cols-2 gap-x-[5mm] gap-y-[3mm]" : "space-y-4 print:space-y-0"}>
        {members.map((m, i) => (
          <article key={m.id} className="carte relative flex h-[54mm] w-[85.6mm] break-inside-avoid flex-col overflow-hidden rounded-[3mm] border border-navy/25 bg-white text-ink">
            <header className="flex h-[11mm] shrink-0 items-center gap-[2mm] px-[3mm]">
              <Image src="/img/logo.webp" alt="FOGEKO" width={124} height={96} className="h-[9.5mm] w-auto" />
              <div className="ml-auto text-right leading-[1.1]">
                <p className="font-slab text-[8pt] font-bold text-navy">Fondation Gekoko</p>
                <p className="text-[5.8pt] font-bold tracking-[0.18em] text-rouge-600 uppercase">Carte de membre</p>
              </div>
            </header>
            <div className="kuba !h-[1.3mm] shrink-0 !bg-[length:5.2mm_1.3mm]" />

            <div className="flex min-h-0 flex-1 items-center gap-[2.5mm] px-[3mm]">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo protégée */}
              <img src={photoUrl(m.photo)} alt="" className="size-[22mm] shrink-0 rounded-[2mm] object-cover ring-[0.6mm] ring-ocre" />
              <div className="min-w-0 flex-1 leading-[1.15]">
                <p className="font-slab line-clamp-2 text-[8.5pt] font-bold break-words text-navy">
                  {m.prenom} {m.nom}{m.postNom ? ` ${m.postNom}` : ""}
                </p>
                <p className="mt-[0.8mm] text-[8.5pt] font-bold tracking-wide text-rouge-600">{formatNumero(m.numero)}</p>
                <dl className="mt-[0.8mm] grid grid-cols-[auto_1fr] gap-x-[1.2mm] text-[6pt]">
                  <dt className="text-ink/65">Catégorie</dt><dd className="truncate font-semibold">{CATEGORIES[m.categorie]}</dd>
                  <dt className="text-ink/65">Commune</dt><dd className="truncate font-semibold">{m.commune.nom} · {m.quartier}</dd>
                  <dt className="text-ink/65">Tél.</dt><dd className="truncate font-semibold">{m.telephone}</dd>
                  <dt className="text-ink/65">Depuis</dt><dd className="truncate font-semibold">{m.dateAdhesion.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</dd>
                </dl>
              </div>
              <div className="flex shrink-0 flex-col items-center">
                <div className="size-[15mm]" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
                <span className="mt-[0.5mm] text-[4.5pt] text-ink/65">Vérification</span>
              </div>
            </div>

            <footer className="flex h-[4mm] shrink-0 items-center justify-between bg-navy px-[3mm] text-[5pt] text-white">
              <span>Kinshasa · République démocratique du Congo</span>
              <span>fogeko.com</span>
            </footer>
          </article>
        ))}
      </div>
      {members.length === 0 && <p>Aucun membre sélectionné.</p>}
      <AutoPrint />
    </div>
  );
}
