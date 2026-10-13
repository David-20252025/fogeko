import { AdminForm } from "@/components/admin/admin-form";
import { Annulee, Annuler } from "@/components/admin/annuler";
import { admInput, admLabel, Text } from "@/components/admin/fields";
import { FinanceTabs, MoisNav, moisCourant } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { moisDe, sommeParDevise, suiviBudgets } from "@/lib/finance-calc";
import { CATEGORIES_DEPENSE, DEVISES, formatMontant, moisLabel, type DeviseKey } from "@/lib/money";
import { addDepense, setBudget } from "../actions";
import { ARCHIVE_MAX } from "@/lib/archive-file";

const DEV = Object.keys(DEVISES) as DeviseKey[];
const CATS = Object.keys(CATEGORIES_DEPENSE) as (keyof typeof CATEGORIES_DEPENSE)[];

export default async function DepensesPage(props: PageProps<"/gestion/finances/depenses">) {
  const user = await requirePerm("FINANCES");
  const nav = moisCourant((await props.searchParams).mois);
  const annee = new Date(Date.UTC(nav.mois.getUTCFullYear(), 0, 1));
  const [depenses, depAnnee, budgets] = await Promise.all([
    db.depense.findMany({ where: { date: { gte: nav.mois, lt: nav.suivant } }, orderBy: { date: "desc" }, include: { saisiPar: { select: { name: true } } } }),
    db.depense.findMany({ where: { date: { gte: annee, lt: new Date(Date.UTC(nav.mois.getUTCFullYear() + 1, 0, 1)) } } }),
    db.budget.findMany({ orderBy: [{ categorie: "asc" }, { periode: "asc" }] }),
  ]);
  const suivi = suiviBudgets(budgets, depAnnee, nav.mois);
  const total = sommeParDevise(depenses);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Dépenses et budgets par catégorie" />
      <FinanceTabs current="depenses" mois={moisDe(nav.mois)} />

      {user.perms.FINANCES.creer && (
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-navy">Enregistrer une dépense</h2>
          <AdminForm action={addDepense} resetOnSuccess submit="Enregistrer la dépense">
            <div className="grid gap-3 sm:grid-cols-4">
              <Text name="date" label="Date" type="date" defaultValue={today} max={today} required />
              <Text name="montant" label="Montant" inputMode="decimal" required />
              <div>
                <label htmlFor="devise" className={admLabel}>Devise</label>
                <select id="devise" name="devise" className={admInput}>{DEV.map((d) => <option key={d} value={d}>{DEVISES[d]}</option>)}</select>
              </div>
              <div>
                <label htmlFor="categorie" className={admLabel}>Catégorie</label>
                <select id="categorie" name="categorie" className={admInput}>{CATS.map((c) => <option key={c} value={c}>{CATEGORIES_DEPENSE[c]}</option>)}</select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Text name="beneficiaire" label="Bénéficiaire ou fournisseur" required />
              <Text name="description" label="Description" required />
            </div>
            <div>
              <label htmlFor="preuve" className={admLabel}>Justificatif (photo ou PDF, {ARCHIVE_MAX / 1024 / 1024} Mo max)</label>
              <input id="preuve" type="file" name="preuve" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-4 file:py-2 file:font-semibold file:text-navy sm:w-auto" />
            </div>
          </AdminForm>
        </section>
      )}

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-1 text-xl font-bold text-navy">Budgets</h2>
        <p className="mb-4 text-sm text-ink/70">Consommation sur {moisLabel(nav.mois)} (mensuel) et sur {nav.mois.getUTCFullYear()} (annuel). Alerte à partir de 80 %.</p>
        {suivi.length === 0 ? <p className="mb-4 text-ink/70">Aucun budget défini.</p> : (
          <ul className="mb-5 grid gap-2 md:grid-cols-2">
            {suivi.map((b) => (
              <li key={`${b.categorie}${b.devise}${b.periode}`} className="rounded-2xl bg-mist p-3">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-semibold text-navy">{CATEGORIES_DEPENSE[b.categorie as keyof typeof CATEGORIES_DEPENSE]} · {b.periode === "MENSUEL" ? "mensuel" : "annuel"}</span>
                  <span className={b.depasse ? "font-bold text-rouge-600" : "text-ink/70"}>{formatMontant(b.depense, b.devise)} / {formatMontant(b.prevu, b.devise)}</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-white" role="img" aria-label={`${b.pourcentage} % du budget utilisé`}>
                  <div className={`h-full rounded-full ${b.depasse ? "bg-rouge-600" : b.pourcentage >= 80 ? "bg-ocre" : "bg-navy"}`} style={{ width: `${Math.min(100, b.pourcentage)}%` }} />
                </div>
                {b.depasse && <p className="mt-1 text-xs font-semibold text-rouge-600">Dépassé ({b.pourcentage} %)</p>}
              </li>
            ))}
          </ul>
        )}
        {user.perms.FINANCES.modifier && (
          <AdminForm action={setBudget} submit="Enregistrer le budget">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label htmlFor="b-categorie" className={admLabel}>Catégorie</label>
                <select id="b-categorie" name="categorie" className={admInput}>{CATS.map((c) => <option key={c} value={c}>{CATEGORIES_DEPENSE[c]}</option>)}</select>
              </div>
              <div>
                <label htmlFor="b-periode" className={admLabel}>Période</label>
                <select id="b-periode" name="periode" className={admInput}><option value="MENSUEL">Mensuel</option><option value="ANNUEL">Annuel</option></select>
              </div>
              <div>
                <label htmlFor="b-devise" className={admLabel}>Devise</label>
                <select id="b-devise" name="devise" className={admInput}>{DEV.map((d) => <option key={d} value={d}>{d}</option>)}</select>
              </div>
              <Text name="montant" id="b-montant" label="Montant (0 = supprimer)" inputMode="decimal" required />
            </div>
          </AdminForm>
        )}
      </section>

      <MoisNav path="/gestion/finances/depenses" {...nav} />
      <section className="overflow-hidden rounded-3xl bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-6 pb-3">
          <h2 className="text-xl font-bold text-navy">Dépenses de {moisLabel(nav.mois)}</h2>
          <p className="text-sm text-ink/70">Total (hors annulées) : {DEV.map((d) => formatMontant(total[d], d)).join(" · ")}</p>
        </div>
        {depenses.length === 0 ? <p className="px-6 pb-6 text-ink/70">Aucune dépense ce mois-ci.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-mist/60 text-ink/70">
                <tr>{["Date", "Catégorie", "Bénéficiaire", "Description", "Montant", "Saisie par", ""].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {depenses.map((d) => (
                  <tr key={d.id} className={d.annuleLe ? "bg-rouge/5 text-ink/60" : ""}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{d.date.toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5">{CATEGORIES_DEPENSE[d.categorie]}</td>
                    <td className="px-4 py-2.5">{d.beneficiaire}</td>
                    <td className="px-4 py-2.5">{d.description}{d.justificatifId && <a href={`/gestion/archives/fichier/${d.justificatifId}`} target="_blank" className="block text-xs font-semibold text-navy underline">Voir le justificatif</a>}</td>
                    <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${d.annuleLe ? "line-through" : "text-navy"}`}>{formatMontant(d.montant, d.devise)}</td>
                    <td className="px-4 py-2.5 text-ink/70">{d.saisiPar.name}</td>
                    <td className="px-4 py-2.5">{d.annuleLe ? <Annulee le={d.annuleLe} motif={d.motifAnnulation} /> : user.perms.FINANCES.modifier && <Annuler type="depense" id={d.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
