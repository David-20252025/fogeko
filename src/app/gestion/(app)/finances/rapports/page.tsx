import Link from "next/link";
import { FinanceTabs } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { TYPES } from "@/lib/finance-lignes";
import { CATEGORIES_DEPENSE, DEVISES } from "@/lib/money";

const field = "min-w-0 rounded-xl border-2 border-navy/10 bg-white px-3 py-2.5 outline-none focus:border-navy";
const label = "grid gap-1 text-sm font-semibold text-ink/70";

export default async function RapportsPage() {
  const user = await requirePerm("FINANCES");
  const p = await db.parametres.findUnique({ where: { id: 1 } });
  const now = new Date();
  const debutMois = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const peut = user.perms.FINANCES.exporter;

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Rapports PDF (logo, filigrane, pied de page) et export Excel" />
      <FinanceTabs current="rapports" />

      {!peut ? (
        <p className="rounded-3xl bg-white p-10 text-center text-ink/70">Votre rôle ne permet pas d&apos;exporter les finances.</p>
      ) : (
        <form action="/gestion/finances/rapports/fichier" target="_blank" className="grid gap-4 rounded-3xl bg-white p-6 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>Du<input type="date" name="du" defaultValue={debutMois} required className={field} /></label>
          <label className={label}>Au<input type="date" name="au" defaultValue={now.toISOString().slice(0, 10)} required className={field} /></label>
          <label className={label}>Type
            <select name="type" className={field}><option value="">Toutes les écritures</option>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className={label}>Devise
            <select name="devise" className={field}><option value="">USD et CDF</option>{Object.entries(DEVISES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className={label}>Catégorie de dépense
            <select name="categorie" className={field}><option value="">Toutes</option>{Object.entries(CATEGORIES_DEPENSE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className={label}>Taux du jour : 1 USD = … CDF
            <input name="taux" inputMode="decimal" defaultValue={p?.tauxUsdCdf?.toString() ?? ""} placeholder="ex. 2850" className={field} />
            <span className="text-xs font-normal">Pour le solde converti en USD. Vide = pas de conversion.
              {user.role.superAdmin && <> Taux par défaut : <Link href="/gestion/administration/parametres" className="font-semibold text-navy underline">Paramètres</Link>.</>}</span>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
            <button className="rounded-xl bg-navy px-6 py-2.5 font-semibold text-white">Générer le rapport PDF</button>
            <button name="format" value="xlsx" className="rounded-xl border-2 border-navy/15 px-6 py-2.5 font-semibold text-navy hover:border-navy">Exporter en Excel</button>
          </div>
        </form>
      )}
    </div>
  );
}
