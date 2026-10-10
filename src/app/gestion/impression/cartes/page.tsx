import Image from "next/image";
import QRCode from "qrcode";
import { AutoPrint } from "@/components/admin/auto-print";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero, photoUrl } from "@/lib/members";

// Cartes au format bancaire (85,6 × 54 mm), 10 par page A4. ?id=… pour une carte, sinon les filtres de la liste.
export default async function PrintCards(props: PageProps<"/gestion/impression/cartes">) {
  await requireUser(["ADMIN", "SECRETAIRE"]);
  const sp = await props.searchParams;
  const where = typeof sp.id === "string" ? { id: sp.id } : memberWhere(parseFilters(sp));
  const [members, total] = await Promise.all([
    db.member.findMany({ where, include: { commune: true }, orderBy: { numero: "asc" }, take: 500 }),
    db.member.count({ where }),
  ]);
  const site = process.env.SITE_URL ?? "https://fogeko.com";
  // Le QR mène à la fiche dans l'espace de gestion : seule l'équipe connectée peut la consulter
  const qrs = await Promise.all(members.map((m) => QRCode.toString(`${site}/gestion/membres/${m.id}`, { type: "svg", margin: 0, color: { dark: "#0A1360", light: "#0000" } })));

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-[10mm] print:p-0">
      <style>{"@page { size: A4 portrait; margin: 10mm } body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact }"}</style>
      {total > members.length && (
        <p className="mb-4 rounded-xl bg-ocre/15 p-3 font-semibold text-ink print:hidden">
          {total} membres correspondent : seules les 500 premières cartes sont affichées. Affinez les filtres (commune, catégorie…) pour imprimer les autres.
        </p>
      )}
      <div className="grid grid-cols-2 gap-[5mm]">
        {members.map((m, i) => (
          <article key={m.id} className="relative flex h-[54mm] w-[85.6mm] break-inside-avoid flex-col overflow-hidden rounded-[3mm] border border-navy/20 bg-white">
            <div className="flex items-center justify-between bg-navy px-[3mm] py-[1.6mm] text-white">
              <span className="font-slab text-[11pt] leading-none font-bold">FOGEKO</span>
              <span className="text-[6.5pt] font-semibold tracking-[0.15em] uppercase">Carte de membre</span>
            </div>
            <div className="flex flex-1 items-center gap-[3mm] px-[3mm]">
              {/* eslint-disable-next-line @next/next/no-img-element -- photo protégée */}
              <img src={photoUrl(m.photo)} alt="" className="size-[22mm] shrink-0 rounded-full object-cover ring-[0.8mm] ring-ocre" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-slab truncate text-[10.5pt] font-bold text-navy">{m.prenom} {m.nom}</p>
                {m.postNom && <p className="truncate text-[7.5pt] text-ink/70">{m.postNom}</p>}
                <p className="mt-[1.2mm] text-[9pt] font-bold text-rouge">{formatNumero(m.numero)}</p>
                <p className="mt-[0.8mm] text-[7pt] text-ink/80">{CATEGORIES[m.categorie]} · {m.commune.nom}</p>
                <p className="text-[6.5pt] text-ink/70">Membre depuis {m.dateAdhesion.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
              </div>
              <div className="size-[17mm] shrink-0" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            </div>
            <div className="flex items-center justify-between px-[3mm] pb-[1.2mm]">
              <Image src="/img/colombe.png" alt="" width={264} height={293} className="h-[4mm] w-auto" />
              <span className="text-[5.5pt] text-ink/65">Fondation Gekoko · Kinshasa, RDC</span>
            </div>
            <div className="kuba kuba-thin !h-[1.6mm] !bg-[length:6.4mm_1.6mm]" />
          </article>
        ))}
      </div>
      {members.length === 0 && <p>Aucun membre.</p>}
      <AutoPrint />
    </div>
  );
}
