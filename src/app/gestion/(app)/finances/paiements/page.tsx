import { AdminForm } from "@/components/admin/admin-form";
import { Annulee, Annuler } from "@/components/admin/annuler";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { admInput, admLabel, Text } from "@/components/admin/fields";
import { FinanceTabs, MoisNav, moisCourant } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { moisDe, paieDuMois } from "@/lib/finance-calc";
import { formatNumero } from "@/lib/members";
import { DEVISES, formatMontant, moisLabel, MOYENS, PERIODICITES, type DeviseKey } from "@/lib/money";
import { addPaiement, designerRemunere, retirerRemunere } from "../actions";

const DEV = Object.keys(DEVISES) as DeviseKey[];

export default async function PaiementsPage(props: PageProps<"/gestion/finances/paiements">) {
  const user = await requirePerm("FINANCES");
  const nav = moisCourant((await props.searchParams).mois);
  const periode = moisDe(nav.mois);
  const [remuneres, paiements] = await Promise.all([
    db.membreRemunere.findMany({ include: { membre: { select: { prenom: true, nom: true, numero: true } }, designePar: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    db.paiement.findMany({ where: { periode }, include: { validePar: { select: { name: true } }, remunere: { include: { membre: { select: { prenom: true, nom: true } } } } }, orderBy: { date: "desc" } }),
  ]);
  const vue = paieDuMois(remuneres, paiements, periode);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Membres rémunérés et paiements (bordereau numéroté pour chaque paiement)" />
      <FinanceTabs current="paiements" mois={periode} />
      <MoisNav path="/gestion/finances/paiements" {...nav} />

      <section className="overflow-hidden rounded-3xl bg-white">
        <div className="p-6 pb-3">
          <h2 className="text-xl font-bold text-navy">Paiements de {moisLabel(nav.mois)}</h2>
          <p className="mt-1 text-sm text-ink/70">
            {DEV.filter((d) => vue.aPayer[d] || vue.paye[d]).map((d) => `${d} : à payer ${formatMontant(vue.aPayer[d], d)}, payé ${formatMontant(vue.paye[d], d)}`).join(" · ") || "Aucun paiement prévu ce mois-ci."}
          </p>
        </div>
        {vue.lignes.length > 0 && (
          <ul className="divide-y divide-navy/5">
            {vue.lignes.map(({ remunere: r, paye, du }) => {
              const rr = remuneres.find((x) => x.id === r.id)!;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold text-navy">{rr.membre.prenom} {rr.membre.nom} <span className="font-normal text-ink/65">({formatNumero(rr.membre.numero)})</span></p>
                    <p className="text-sm text-ink/70">{rr.fonction} · {formatMontant(rr.montant, rr.devise)} · {PERIODICITES[rr.periodicite].toLowerCase()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${paye ? "bg-emerald-50 text-emerald-700" : du ? "bg-rouge/10 text-rouge-600" : "bg-mist"}`}>{paye ? "Payé" : "Non payé"}</span>
                  {!paye && rr.actif && user.perms.FINANCES.creer && (
                    <details className="w-full">
                      <summary className="cursor-pointer font-semibold text-navy">Enregistrer le paiement</summary>
                      <div className="mt-3 rounded-2xl bg-mist p-4">
                        <AdminForm action={addPaiement} submit="Valider le paiement">
                          <input type="hidden" name="remunereId" value={rr.id} />
                          <input type="hidden" name="devise" value={rr.devise} />
                          <div className="grid gap-3 sm:grid-cols-4">
                            <Text name="periode" id={`periode-${rr.id}`} label="Période concernée" type="month" defaultValue={periode} required />
                            <Text name="date" id={`date-${rr.id}`} label="Date du paiement" type="date" defaultValue={today} max={today} required />
                            <Text name="montant" id={`montant-${rr.id}`} label={`Montant (${rr.devise})`} defaultValue={rr.montant.toString()} inputMode="decimal" required />
                            <div>
                              <label htmlFor={`moyen-${rr.id}`} className={admLabel}>Mode</label>
                              <select id={`moyen-${rr.id}`} name="moyen" defaultValue="MPESA" className={admInput}>{Object.entries(MOYENS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Text name="reference" id={`ref-${rr.id}`} label="Référence (n° de transaction…)" />
                            <div>
                              <label htmlFor={`preuve-${rr.id}`} className={admLabel}>Preuve (photo ou PDF)</label>
                              <input id={`preuve-${rr.id}`} type="file" name="preuve" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full min-w-0 text-sm" />
                            </div>
                          </div>
                        </AdminForm>
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl bg-white">
        <h2 className="p-6 pb-3 text-xl font-bold text-navy">Bordereaux de {moisLabel(nav.mois)}</h2>
        {paiements.length === 0 ? <p className="px-6 pb-6 text-ink/70">Aucun paiement enregistré.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-mist/60 text-ink/70">
                <tr>{["Bordereau", "Date", "Membre", "Montant", "Mode / référence", "Validé par", ""].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {paiements.map((p) => (
                  <tr key={p.id} className={p.annuleLe ? "bg-rouge/5 text-ink/60" : ""}>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{p.numeroBordereau}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{p.date.toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5">{p.remunere.membre.prenom} {p.remunere.membre.nom}</td>
                    <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${p.annuleLe ? "line-through" : "text-navy"}`}>{formatMontant(p.montant, p.devise)}</td>
                    <td className="px-4 py-2.5">{MOYENS[p.moyen]}{p.reference && <span className="block text-xs text-ink/65">{p.reference}</span>}
                      {p.preuveId && <a href={`/gestion/archives/fichier/${p.preuveId}`} target="_blank" className="block text-xs font-semibold text-navy underline">Voir la preuve</a>}</td>
                    <td className="px-4 py-2.5 text-ink/70">{p.validePar.name}</td>
                    <td className="px-4 py-2.5">{p.annuleLe ? <Annulee le={p.annuleLe} motif={p.motifAnnulation} /> : user.perms.FINANCES.modifier && <Annuler type="paiement" id={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6">
        <h2 className="text-xl font-bold text-navy">Membres rémunérés</h2>
        <p className="mb-4 text-sm text-ink/70">Seul le super admin désigne ou retire les membres rémunérés.</p>
        {remuneres.length === 0 ? <p className="mb-4 text-ink/70">Aucun membre désigné.</p> : (
          <ul className="mb-5 divide-y divide-navy/5">
            {remuneres.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-3 py-3 ${r.actif ? "" : "text-ink/50"}`}>
                <span className="min-w-48 flex-1"><strong className={r.actif ? "text-navy" : ""}>{r.membre.prenom} {r.membre.nom}</strong> · {r.fonction} · {formatMontant(r.montant, r.devise)} ({PERIODICITES[r.periodicite].toLowerCase()}, depuis {moisLabel(r.debut)})</span>
                <span className="text-xs text-ink/65">désigné par {r.designePar.name}</span>
                {!r.actif && <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-semibold">retiré</span>}
                {r.actif && user.role.superAdmin && (
                  <form action={retirerRemunere.bind(null, r.id)}>
                    <ConfirmButton message={`Retirer ${r.membre.prenom} ${r.membre.nom} des membres rémunérés ? Ses paiements passés sont conservés.`} className="text-sm font-semibold text-rouge-600 hover:underline">Retirer</ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {user.role.superAdmin && (
          <AdminForm action={designerRemunere} resetOnSuccess submit="Désigner ce membre">
            <div className="grid gap-3 sm:grid-cols-3">
              <Text name="membreRef" label="Membre : n° FOGEKO ou téléphone" placeholder="FOGEKO-0012" required />
              <Text name="fonction" label="Fonction" placeholder="ex. Coordinateur de terrain" required />
              <Text name="debut" label="Premier mois concerné" type="month" defaultValue={periode} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Text name="montant" id="r-montant" label="Montant convenu" inputMode="decimal" required />
              <div>
                <label htmlFor="r-devise" className={admLabel}>Devise</label>
                <select id="r-devise" name="devise" className={admInput}>{DEV.map((d) => <option key={d} value={d}>{DEVISES[d]}</option>)}</select>
              </div>
              <div>
                <label htmlFor="r-periodicite" className={admLabel}>Périodicité</label>
                <select id="r-periodicite" name="periodicite" className={admInput}>{Object.entries(PERIODICITES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
            </div>
            <p className="text-xs text-ink/70">Désigner à nouveau un membre déjà présent met à jour ses conditions et le réactive.</p>
          </AdminForm>
        )}
      </section>
    </div>
  );
}
