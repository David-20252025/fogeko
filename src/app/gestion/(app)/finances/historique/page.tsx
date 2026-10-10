import Link from "next/link";
import { Annulee, Annuler } from "@/components/admin/annuler";
import { FinanceTabs } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { sommeParDevise } from "@/lib/finance-calc";
import { lignesFinance, parseFiltresFinance, TYPES } from "@/lib/finance-lignes";
import { CATEGORIES_DEPENSE, DEVISES, formatMontant, type DeviseKey } from "@/lib/money";

const DEV = Object.keys(DEVISES) as DeviseKey[];
const field = "min-w-0 rounded-xl border-2 border-navy/10 bg-white px-3 py-2.5 outline-none focus:border-navy";
const LIMITE = 500;

export default async function HistoriquePage(props: PageProps<"/gestion/finances/historique">) {
  const user = await requirePerm("FINANCES");
  const filtres = parseFiltresFinance(await props.searchParams);
  const { du, au, type, devise, categorie, userId, membre, statut } = filtres;
  const [lignes, users] = await Promise.all([
    lignesFinance(filtres),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const entrees = sommeParDevise(lignes.filter((l) => l.sens === 1));
  const sorties = sommeParDevise(lignes.filter((l) => l.sens === -1));
  const affichees = lignes.slice(0, LIMITE);

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Historique complet : dons, dépenses, paiements et fonds — les écritures annulées restent visibles" />
      <FinanceTabs current="historique" />

      <form className="grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtres">
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Du<input type="date" name="du" defaultValue={du.toISOString().slice(0, 10)} className={field} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Au<input type="date" name="au" defaultValue={au.toISOString().slice(0, 10)} className={field} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Type
          <select name="type" defaultValue={type ?? ""} className={field}><option value="">Tous</option>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Devise
          <select name="devise" defaultValue={devise ?? ""} className={field}><option value="">USD et CDF</option>{DEV.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Catégorie de dépense
          <select name="categorie" defaultValue={categorie ?? ""} className={field}><option value="">Toutes</option>{Object.entries(CATEGORIES_DEPENSE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Membre (nom)<input name="membre" defaultValue={membre} className={field} /></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Saisi par
          <select name="userId" defaultValue={userId ?? ""} className={field}><option value="">Tous</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-ink/70">Statut
          <select name="statut" defaultValue={statut ?? ""} className={field}><option value="">Toutes</option><option value="valides">Valides</option><option value="annulees">Annulées</option></select></label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button className="rounded-xl bg-navy px-6 py-2.5 font-semibold text-white">Filtrer</button>
          <Link href="/gestion/finances/historique" className="rounded-xl px-4 py-2.5 font-semibold text-navy hover:bg-mist">Réinitialiser</Link>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {DEV.map((d) => (
          <p key={d} className="rounded-2xl bg-white px-5 py-3 text-sm">
            <strong className="text-navy">{d}</strong> — entrées {formatMontant(entrees[d], d)} · sorties {formatMontant(sorties[d], d)} · solde <strong>{formatMontant(entrees[d] - sorties[d], d)}</strong>
          </p>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl bg-white">
        <p className="p-4 text-sm text-ink/70">{lignes.length} écriture(s){lignes.length > LIMITE ? ` — ${LIMITE} premières affichées, affinez les filtres` : ""}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-mist/60 text-ink/70">
              <tr>{["Date", "Type", "Libellé", "Montant", "Saisi par", "Statut"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {affichees.map((l) => (
                <tr key={l.key} className={l.annuleLe ? "bg-rouge/5 text-ink/60" : ""}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{l.date.toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-2.5">{TYPES[l.type]}</td>
                  <td className="px-4 py-2.5">{l.libelle}{l.detail && <span className="block text-xs text-ink/65">{l.detail}</span>}
                    {l.preuveId && <a href={`/gestion/archives/fichier/${l.preuveId}`} target="_blank" className="block text-xs font-semibold text-navy underline">Justificatif</a>}</td>
                  <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${l.annuleLe ? "line-through" : l.sens === 1 ? "text-emerald-700" : "text-rouge-600"}`}>{l.sens === 1 ? "+" : "−"} {formatMontant(l.montant, l.devise)}</td>
                  <td className="px-4 py-2.5 text-ink/70">{l.auteur}</td>
                  <td className="px-4 py-2.5">{l.annuleLe ? <Annulee le={l.annuleLe} motif={l.motif} /> : l.type !== "fonds" && user.perms.FINANCES.modifier ? <Annuler type={l.type} id={l.id} /> : <span className="text-xs text-emerald-700">Valide</span>}</td>
                </tr>
              ))}
              {affichees.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink/70">Aucune écriture pour ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
