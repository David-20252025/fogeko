import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { admInput, admLabel, Area, Text } from "@/components/admin/fields";
import { FinanceTabs, MoisNav, moisCourant } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { bilan, convertiUsd, moisDe, paieDuMois, suiviBudgets } from "@/lib/finance-calc";
import { CATEGORIES_DEPENSE, DEVISES, formatMontant, moisLabel, type DeviseKey } from "@/lib/money";
import { declarerFonds } from "./actions";

const DEV = Object.keys(DEVISES) as DeviseKey[];

// Chargement hors du composant (dépend de la date du jour)
async function load(param: unknown) {
  const nav = moisCourant(param);
  const { mois, suivant, courant } = nav;
  const debut12 = new Date(Date.UTC(courant.getUTCFullYear(), courant.getUTCMonth() - 11, 1));
  const anneeDebut = new Date(Date.UTC(mois.getUTCFullYear(), 0, 1));
  const periode = moisDe(mois);
  const [dons, fonds, depenses, paiements, budgets, remuneres, params, fondsMois] = await Promise.all([
    db.don.findMany({ where: { date: { gte: debut12 < anneeDebut ? debut12 : anneeDebut } } }),
    db.fondsMensuel.findMany({ where: { mois: { gte: debut12 } } }),
    db.depense.findMany({ where: { date: { gte: debut12 < anneeDebut ? debut12 : anneeDebut } } }),
    db.paiement.findMany({ where: { date: { gte: debut12 } } }),
    db.budget.findMany(),
    db.membreRemunere.findMany({ where: { actif: true } }),
    db.parametres.findUnique({ where: { id: 1 } }),
    db.fondsMensuel.findMany({ where: { mois }, include: { declarePar: { select: { name: true } } } }),
  ]);
  const duMois = <T extends { date: Date }>(l: T[]) => l.filter((x) => x.date >= mois && x.date < suivant);
  const fondsDuMois = fonds.filter((f) => moisDe(f.mois) === periode).map((f) => ({ ...f, annuleLe: null }));
  const b = bilan([...duMois(dons), ...fondsDuMois], [...duMois(depenses), ...duMois(paiements)]);
  const taux = params?.tauxUsdCdf ? Number(params.tauxUsdCdf) : null;
  const alertes = suiviBudgets(budgets, depenses, mois).filter((x) => x.pourcentage >= 80);
  const paie = paieDuMois(remuneres, paiements.map((p) => ({ ...p, remunereId: p.remunereId })), periode);
  const historique = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(Date.UTC(courant.getUTCFullYear(), courant.getUTCMonth() - i, 1));
    const p = moisDe(m);
    const de = <T extends { date: Date }>(l: T[]) => l.filter((x) => moisDe(x.date) === p);
    return { m, ...bilan([...de(dons), ...fonds.filter((f) => moisDe(f.mois) === p).map((f) => ({ ...f, annuleLe: null }))], [...de(depenses), ...de(paiements)]) };
  });
  return { nav, b, taux, alertes, paie, historique, fondsMois, periode };
}

export default async function FinancesDashboard(props: PageProps<"/gestion/finances">) {
  const user = await requirePerm("FINANCES");
  const { nav, b, taux, alertes, paie, historique, fondsMois, periode } = await load((await props.searchParams).mois);
  const nonPayes = paie.lignes.filter((l) => l.du && !l.paye).length;

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Entrées, sorties et solde par devise — sans conversion automatique" />
      <FinanceTabs current="bord" mois={periode} />
      <MoisNav path="/gestion/finances" {...nav} />

      <div className="grid gap-4 md:grid-cols-2">
        {DEV.map((d) => (
          <section key={d} className="rounded-3xl bg-white p-6">
            <p className="font-semibold text-ink/70">{DEVISES[d]}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-mist p-3"><dt className="text-sm text-ink/70">Entrées</dt><dd className="font-slab mt-1 text-lg font-bold text-emerald-700 md:text-xl">{formatMontant(b.entrees[d], d)}</dd></div>
              <div className="rounded-2xl bg-mist p-3"><dt className="text-sm text-ink/70">Sorties</dt><dd className="font-slab mt-1 text-lg font-bold text-rouge-600 md:text-xl">{formatMontant(b.sorties[d], d)}</dd></div>
              <div className="rounded-2xl bg-navy p-3 text-white"><dt className="text-sm text-white/80">Solde</dt><dd className="font-slab mt-1 text-lg font-bold md:text-xl">{formatMontant(b.solde[d], d)}</dd></div>
            </dl>
          </section>
        ))}
      </div>
      {taux && (
        <p className="rounded-2xl bg-white px-5 py-3 text-sm text-ink/80">
          Solde converti (taux saisi 1 USD = {taux.toLocaleString("fr-FR")} CDF) : <strong className="text-navy">{formatMontant(convertiUsd(b.solde, taux)!, "USD")}</strong>
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-navy">Paiements des membres</h2>
            <Link href={`/gestion/finances/paiements?mois=${periode}`} className="text-sm font-semibold text-navy underline">Détail</Link>
          </div>
          {paie.lignes.length === 0 ? <p className="text-ink/70">Aucun paiement prévu ce mois-ci.</p> : (
            <ul className="space-y-1 text-sm">
              {DEV.filter((d) => paie.aPayer[d] || paie.paye[d]).map((d) => (
                <li key={d}>Total à payer <strong>{formatMontant(paie.aPayer[d], d)}</strong> · total payé <strong>{formatMontant(paie.paye[d], d)}</strong></li>
              ))}
              <li className={nonPayes ? "font-semibold text-rouge-600" : "text-emerald-700"}>{nonPayes ? `${nonPayes} membre(s) non payé(s)` : "Tous les membres dus sont payés"}</li>
            </ul>
          )}
        </section>
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-3 text-xl font-bold text-navy">Budgets</h2>
          {alertes.length === 0 ? <p className="text-ink/70">Aucun budget atteint à 80 % ou plus.</p> : (
            <ul className="space-y-2 text-sm">
              {alertes.map((a) => (
                <li key={`${a.categorie}${a.devise}${a.periode}`} className={`rounded-xl px-3 py-2 ${a.depasse ? "bg-rouge/10 font-semibold text-rouge-600" : "bg-ocre/15"}`}>
                  {a.depasse ? "Dépassé" : "Presque atteint"} : {CATEGORIES_DEPENSE[a.categorie as keyof typeof CATEGORIES_DEPENSE]} ({a.periode === "MENSUEL" ? "mensuel" : "annuel"}) — {formatMontant(a.depense, a.devise)} / {formatMontant(a.prevu, a.devise)} ({a.pourcentage} %)
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-1 text-xl font-bold text-navy">Fonds du mois</h2>
        {fondsMois.length === 0 ? <p className="mb-4 text-ink/70">Aucun fonds déclaré pour {moisLabel(nav.mois)}.</p> : (
          <ul className="mb-4 space-y-1 text-sm text-ink/80">
            {fondsMois.map((f) => <li key={f.id}><strong className="text-navy">{formatMontant(f.montant, f.devise)}</strong> — déclaré par {f.declarePar.name}, le {f.updatedAt.toLocaleDateString("fr-FR")}{f.note ? ` · ${f.note}` : ""}</li>)}
          </ul>
        )}
        {user.role.superAdmin ? (
          <AdminForm action={declarerFonds} submit="Déclarer le fonds">
            <div className="grid gap-3 sm:grid-cols-3">
              <Text name="mois" label="Mois" type="month" defaultValue={periode} max={moisDe(nav.courant)} required />
              <div>
                <label htmlFor="devise-fonds" className={admLabel}>Devise</label>
                <select id="devise-fonds" name="devise" className={admInput}>{DEV.map((d) => <option key={d} value={d}>{DEVISES[d]}</option>)}</select>
              </div>
              <Text name="montant" id="montant-fonds" label="Montant" inputMode="decimal" placeholder="ex. 2 000" required />
            </div>
            <Area name="note" id="note-fonds" label="Note (facultatif)" rows={2} />
            <p className="text-xs text-ink/70">Un fonds par mois et par devise : une nouvelle déclaration remplace la précédente.</p>
          </AdminForm>
        ) : <p className="rounded-xl bg-mist p-3 text-sm text-ink/70">Seul le super admin déclare le fonds mensuel.</p>}
      </section>

      <section className="overflow-hidden rounded-3xl bg-white">
        <h2 className="p-6 pb-3 text-xl font-bold text-navy">12 derniers mois</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-mist/60 text-ink/70">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Mois</th>
                {DEV.map((d) => [<th key={`e${d}`} className="px-3 py-2.5 font-semibold">Entrées {d}</th>, <th key={`s${d}`} className="px-3 py-2.5 font-semibold">Sorties {d}</th>, <th key={`b${d}`} className="px-3 py-2.5 font-semibold">Solde {d}</th>])}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {historique.map((h) => (
                <tr key={moisDe(h.m)} className={moisDe(h.m) === periode ? "bg-mist/60" : ""}>
                  <td className="px-4 py-2.5 text-left"><Link href={`/gestion/finances?mois=${moisDe(h.m)}`} className="font-semibold text-navy capitalize hover:underline">{moisLabel(h.m)}</Link></td>
                  {DEV.map((d) => [
                    <td key={`e${d}`} className="px-3 py-2.5 whitespace-nowrap">{formatMontant(h.entrees[d], d)}</td>,
                    <td key={`s${d}`} className="px-3 py-2.5 whitespace-nowrap">{formatMontant(h.sorties[d], d)}</td>,
                    <td key={`b${d}`} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${h.solde[d] < 0 ? "text-rouge-600" : "text-navy"}`}>{formatMontant(h.solde[d], d)}</td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
