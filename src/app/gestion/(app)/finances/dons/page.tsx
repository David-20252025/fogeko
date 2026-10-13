import { AdminForm } from "@/components/admin/admin-form";
import { Annulee, Annuler } from "@/components/admin/annuler";
import { admInput, admLabel, Text } from "@/components/admin/fields";
import { FinanceTabs, MoisNav, moisCourant } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { moisDe, sommeParDevise } from "@/lib/finance-calc";
import { formatNumero } from "@/lib/members";
import { DEVISES, formatMontant, moisLabel, MOYENS, TYPES_DONATEUR, type DeviseKey } from "@/lib/money";
import { addDon } from "../actions";

const DEV = Object.keys(DEVISES) as DeviseKey[];

export default async function DonsPage(props: PageProps<"/gestion/finances/dons">) {
  const user = await requirePerm("FINANCES");
  const nav = moisCourant((await props.searchParams).mois);
  const dons = await db.don.findMany({
    where: { date: { gte: nav.mois, lt: nav.suivant } }, orderBy: { date: "desc" },
    include: { membre: { select: { prenom: true, nom: true, numero: true } }, saisiPar: { select: { name: true } } },
  });
  const total = sommeParDevise(dons);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Dons et soutiens reçus" />
      <FinanceTabs current="dons" mois={moisDe(nav.mois)} />

      {user.perms.FINANCES.creer && (
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-navy">Enregistrer un don</h2>
          <AdminForm action={addDon} resetOnSuccess submit="Enregistrer le don">
            <div className="grid gap-3 sm:grid-cols-4">
              <Text name="date" label="Date" type="date" defaultValue={today} max={today} required />
              <Text name="montant" label="Montant" inputMode="decimal" placeholder="ex. 50" required />
              <div>
                <label htmlFor="devise" className={admLabel}>Devise</label>
                <select id="devise" name="devise" className={admInput}>{DEV.map((d) => <option key={d} value={d}>{DEVISES[d]}</option>)}</select>
              </div>
              <div>
                <label htmlFor="moyen" className={admLabel}>Mode de paiement</label>
                <select id="moyen" name="moyen" defaultValue="MPESA" className={admInput}>{Object.entries(MOYENS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="typeDonateur" className={admLabel}>Donateur</label>
                <select id="typeDonateur" name="typeDonateur" defaultValue="EXTERNE" className={admInput}>{Object.entries(TYPES_DONATEUR).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
              <Text name="membreRef" label="Si membre : n° FOGEKO ou téléphone" placeholder="FOGEKO-0012" />
              <Text name="donateur" label="Si pasteur / externe : nom" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Text name="telephone" label="Téléphone (facultatif)" type="tel" />
              <Text name="reference" label="Référence (n° de transaction…)" />
              <Text name="motif" label="Motif" placeholder="ex. soutien action sociale" />
            </div>
            <div>
              <label htmlFor="preuve" className={admLabel}>Preuve (photo ou PDF, 10 Mo max, facultatif)</label>
              <input id="preuve" type="file" name="preuve" accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full min-w-0 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-4 file:py-2 file:font-semibold file:text-navy sm:w-auto" />
            </div>
            <p className="text-xs text-ink/70">Un numéro de reçu (REC-année-0001) est attribué automatiquement ; le reçu PDF sera disponible avec le module Rapports.</p>
          </AdminForm>
        </section>
      )}

      <MoisNav path="/gestion/finances/dons" {...nav} />
      <section className="overflow-hidden rounded-3xl bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-6 pb-3">
          <h2 className="text-xl font-bold text-navy">Dons de {moisLabel(nav.mois)}</h2>
          <p className="text-sm text-ink/70">Total (hors annulés) : {DEV.map((d) => formatMontant(total[d], d)).join(" · ")}</p>
        </div>
        {dons.length === 0 ? <p className="px-6 pb-6 text-ink/70">Aucun don ce mois-ci.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-mist/60 text-ink/70">
                <tr>{["Reçu", "Date", "Donateur", "Montant", "Mode", "Motif / référence", "Saisi par", ""].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {dons.map((d) => (
                  <tr key={d.id} className={d.annuleLe ? "bg-rouge/5 text-ink/60" : ""}>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{d.numeroRecu}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{d.date.toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5">
                      {d.membre ? `${d.membre.prenom} ${d.membre.nom} (${formatNumero(d.membre.numero)})` : d.donateur ?? <em>Anonyme</em>}
                      <span className="block text-xs text-ink/65">{TYPES_DONATEUR[d.typeDonateur]}{d.telephone ? ` · ${d.telephone}` : ""}</span>
                    </td>
                    <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${d.annuleLe ? "line-through" : "text-navy"}`}>{formatMontant(d.montant, d.devise)}</td>
                    <td className="px-4 py-2.5">{MOYENS[d.moyen]}</td>
                    <td className="px-4 py-2.5">{d.motif}{d.reference && <span className="block text-xs text-ink/65">{d.reference}</span>}
                      {d.preuveId && <a href={`/gestion/archives/fichier/${d.preuveId}`} target="_blank" className="block text-xs font-semibold text-navy underline">Voir la preuve</a>}</td>
                    <td className="px-4 py-2.5 text-ink/70">{d.saisiPar.name}</td>
                    <td className="px-4 py-2.5">{d.annuleLe ? <Annulee le={d.annuleLe} motif={d.motifAnnulation} /> : user.perms.FINANCES.modifier && <Annuler type="don" id={d.id} />}</td>
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
