import Image from "next/image";
import { AutoPrint } from "@/components/admin/auto-print";
import { EDITORS, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero, photoUrl, STATUTS } from "@/lib/members";

export default async function PrintMembers(props: PageProps<"/gestion/impression/membres">) {
  await requireUser(EDITORS);
  const f = parseFilters(await props.searchParams);
  const [members, commune] = await Promise.all([
    db.member.findMany({ where: memberWhere(f), include: { commune: true }, orderBy: { numero: "asc" } }),
    f.communeId ? db.commune.findUnique({ where: { id: f.communeId } }) : null,
  ]);
  // Au-delà de 300 lignes, les miniatures rendraient le document trop lourd (téléphones, réseau lent)
  const avecPhotos = members.length <= 300;
  const filtres = [f.q && `« ${f.q} »`, f.categorie && CATEGORIES[f.categorie], commune?.nom, f.quartier && `quartier ${f.quartier}`, f.statut && STATUTS[f.statut]].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1100px] bg-white p-8 text-[12px] print:p-0">
      <style>{"@page { size: A4 landscape; margin: 12mm } body { background: #fff }"}</style>
      <header className="flex items-center justify-between border-b-4 border-navy pb-3">
        <div className="flex items-center gap-3">
          <Image src="/img/logo.webp" alt="" width={72} height={56} className="h-14 w-auto" />
          <div>
            <p className="font-slab text-2xl font-bold text-navy">Liste des membres</p>
            <p className="text-ink/70">{filtres.length ? `Filtres : ${filtres.join(" · ")}` : "Tous les membres"} — {members.length} membre(s){avecPhotos ? "" : " · sans photos (liste longue)"}</p>
          </div>
        </div>
        <p className="text-right text-ink/70">Fondation Gekoko (FOGEKO)<br />Édité le {new Date().toLocaleDateString("fr-FR")}<br /><strong>Document confidentiel</strong></p>
      </header>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="bg-navy text-left text-white">
            {[...(avecPhotos ? [""] : []), "N°", "Nom complet", "Sexe", "Téléphone", "Catégorie", "Commune", "Quartier", "Profession", "Adhésion", "Statut"].map((h) => <th key={h} className="px-2 py-1.5">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id} className={`break-inside-avoid ${i % 2 ? "bg-mist" : ""}`}>
              {avecPhotos && (
                // eslint-disable-next-line @next/next/no-img-element -- photo protégée
                <td className="px-2 py-1"><img src={photoUrl(m.photoThumb)} alt="" className="size-7 rounded-full object-cover" /></td>
              )}
              <td className="px-2 font-semibold whitespace-nowrap">{formatNumero(m.numero)}</td>
              <td className="px-2">{m.nom} {m.postNom} {m.prenom}</td>
              <td className="px-2">{m.sexe}</td>
              <td className="px-2 whitespace-nowrap">{m.telephone}</td>
              <td className="px-2">{CATEGORIES[m.categorie]}</td>
              <td className="px-2">{m.commune.nom}</td>
              <td className="px-2">{m.quartier}</td>
              <td className="px-2">{m.profession}</td>
              <td className="px-2">{m.dateAdhesion.toLocaleDateString("fr-FR")}</td>
              <td className="px-2">{STATUTS[m.statut]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <AutoPrint />
    </div>
  );
}
