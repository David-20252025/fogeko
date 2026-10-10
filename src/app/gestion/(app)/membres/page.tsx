import Link from "next/link";
import { CardSelection } from "@/components/admin/card-selection";
import { StatutBadge } from "@/components/admin/statut-badge";
import { can, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { filtersToQuery, memberWhere, parseFilters } from "@/lib/member-query";
import { CATEGORIES, formatNumero, photoUrl, STATUTS } from "@/lib/members";

const PER_PAGE = 25;
const field = "min-w-0 rounded-xl border-2 border-navy/10 bg-white px-3.5 py-2.5 outline-none focus:border-navy";

export default async function MembersPage(props: PageProps<"/gestion/membres">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const f = parseFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = memberWhere(f);

  const [members, total, communes] = await Promise.all([
    db.member.findMany({ where, include: { commune: true }, orderBy: { numero: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.member.count({ where }),
    db.commune.findMany({ orderBy: { nom: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = filtersToQuery(f);
  const pageHref = (p: number) => `/gestion/membres?${new URLSearchParams([...new URLSearchParams(qs), ["page", String(p)]])}`;
  const filtered = qs.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-slab text-3xl font-bold text-navy md:text-4xl">Membres</h1>
          <p className="mt-1 text-ink/70">{total} membre{total > 1 ? "s" : ""}{filtered ? " correspondant aux filtres" : ""}</p>
        </div>
        {can.export(user.role) && (
          <div className="flex flex-wrap gap-2">
            <a href={`/gestion/membres/export?${qs}`} className="rounded-full bg-navy px-5 py-2.5 font-semibold text-white hover:bg-navy-700">Export Excel</a>
            <Link href={`/gestion/impression/cartes?${qs}`} target="_blank" className="rounded-full border-2 border-navy/15 px-5 py-2.5 font-semibold text-navy hover:border-navy">Cartes (tous les résultats)</Link>
            <Link href={`/gestion/impression/membres?${qs}`} target="_blank" className="rounded-full border-2 border-navy px-5 py-2.5 font-semibold text-navy hover:bg-navy hover:text-white">Export PDF</Link>
          </div>
        )}
      </div>

      <form className="grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]" aria-label="Filtres">
        <input name="q" type="search" defaultValue={f.q} placeholder="Nom, téléphone ou n° FOGEKO" aria-label="Recherche" className={field} />
        <select name="categorie" defaultValue={f.categorie ?? ""} aria-label="Catégorie" className={field}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="communeId" defaultValue={f.communeId ?? ""} aria-label="Commune" className={field}>
          <option value="">Toutes communes</option>
          {communes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <input name="quartier" defaultValue={f.quartier} placeholder="Quartier" aria-label="Quartier" className={field} />
        <select name="statut" defaultValue={f.statut ?? ""} aria-label="Statut" className={field}>
          <option value="">Tous statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="flex-1 rounded-xl bg-rouge-600 px-5 py-2.5 font-semibold text-white hover:bg-rouge-700">Filtrer</button>
          {filtered && <Link href="/gestion/membres" className="rounded-xl px-3 py-2.5 font-semibold text-navy hover:bg-mist" aria-label="Effacer les filtres">✕</Link>}
        </div>
      </form>

      {can.export(user.role) && members.length > 0 && <CardSelection formId="selection-cartes" />}
      {/* Formulaire de sélection : les cases des lignes y sont rattachées via form="…" */}
      <form id="selection-cartes" action="/gestion/impression/cartes" target="_blank" />

      <div className="overflow-hidden rounded-3xl bg-white">
        {members.length === 0 ? (
          <p className="p-10 text-center text-ink/70">Aucun membre ne correspond.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="hidden bg-mist/60 text-sm text-ink/70 md:table-header-group">
              <tr>
                <th className="px-5 py-3 font-semibold">Membre</th>
                <th className="px-3 py-3 font-semibold">Téléphone</th>
                <th className="px-3 py-3 font-semibold">Catégorie</th>
                <th className="px-3 py-3 font-semibold">Commune / quartier</th>
                <th className="px-3 py-3 font-semibold">Adhésion</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {members.map((m) => (
                <tr key={m.id} className="relative block hover:bg-mist/60 md:table-row">
                  <td className="flex items-center gap-3 px-5 pt-4 md:table-cell md:py-3">
                    {can.export(user.role) && (
                      <input type="checkbox" name="id" value={m.id} form="selection-cartes" aria-label={`Sélectionner ${m.prenom} ${m.nom}`} className="relative z-10 mr-3 size-5 shrink-0 accent-navy md:align-middle" />
                    )}
                    <Link href={`/gestion/membres/${m.id}`} className="inline-flex items-center gap-3 align-middle after:absolute after:inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element -- photo protégée */}
                      <img src={photoUrl(m.photoThumb)} alt="" width={44} height={44} loading="lazy" className="size-11 rounded-full object-cover" />
                      <span>
                        <span className="block font-semibold text-navy">{m.prenom} {m.nom} {m.postNom}</span>
                        <span className="block text-sm text-ink/65">{formatNumero(m.numero)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="inline-block py-1 pl-[4.75rem] text-sm text-ink/70 md:table-cell md:px-3 md:py-3 md:text-base">{m.telephone}</td>
                  <td className="inline-block px-2 text-sm md:table-cell md:px-3"><span className="rounded-full bg-mist px-2.5 py-1 font-medium text-navy">{CATEGORIES[m.categorie]}</span></td>
                  <td className="block pb-1 pl-[4.75rem] text-sm text-ink/70 md:table-cell md:px-3 md:py-3 md:text-base">{m.commune.nom} · {m.quartier}</td>
                  <td className="hidden px-3 py-3 text-ink/70 md:table-cell">{m.dateAdhesion.toLocaleDateString("fr-FR")}</td>
                  <td className="block pb-4 pl-[4.75rem] md:table-cell md:px-5 md:py-3"><StatutBadge statut={m.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && <Link href={pageHref(page - 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">← Précédent</Link>}
          <span className="text-ink/70">Page {page} / {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">Suivant →</Link>}
        </nav>
      )}
    </div>
  );
}
