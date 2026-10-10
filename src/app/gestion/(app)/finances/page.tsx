import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { admInput, admLabel, Area, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { ADMINS, can, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEVISES, formatMontant, moisCle, moisDebut, moisLabel, MOYENS, type DeviseKey } from "@/lib/money";
import { addDon, declarerFonds, deleteDon } from "./actions";

const DEV = Object.keys(DEVISES) as DeviseKey[];

function DeviseSelect({ id }: { id: string }) {
  return (
    <div>
      <label htmlFor={id} className={admLabel}>Devise</label>
      <select id={id} name="devise" defaultValue="USD" className={admInput}>
        {DEV.map((d) => <option key={d} value={d}>{DEVISES[d]}</option>)}
      </select>
    </div>
  );
}

// Chargement hors du composant : dépend de la date du jour
async function load(moisParam: string | undefined) {
  const now = new Date();
  const courant = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const mois = (moisParam && moisDebut(moisParam)) || courant;
  const suivant = new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() + 1, 1));
  const debut12 = new Date(Date.UTC(courant.getUTCFullYear(), courant.getUTCMonth() - 11, 1));

  const [dons, fondsMois, fonds12, dons12] = await Promise.all([
    db.don.findMany({ where: { date: { gte: mois, lt: suivant } }, orderBy: { date: "desc" }, include: { saisiPar: { select: { name: true } } } }),
    db.fondsMensuel.findMany({ where: { mois }, include: { declarePar: { select: { name: true } } } }),
    db.fondsMensuel.findMany({ where: { mois: { gte: debut12 } } }),
    db.$queryRaw<{ m: Date; devise: DeviseKey; total: string }[]>`
      SELECT date_trunc('month', "date") AS m, devise, sum(montant)::text AS total FROM "Don"
      WHERE "date" >= ${debut12} GROUP BY 1, 2`,
  ]);

  const sumDons = (d: DeviseKey) => dons.filter((x) => x.devise === d).reduce((a, x) => a + Number(x.montant), 0);
  const resume = DEV.map((d) => {
    const fonds = Number(fondsMois.find((f) => f.devise === d)?.montant ?? 0);
    const recus = sumDons(d);
    return { devise: d, fonds, recus, total: fonds + recus, nb: dons.filter((x) => x.devise === d).length };
  });
  const historique = Array.from({ length: 12 }, (_, i) => {
    const m = new Date(Date.UTC(courant.getUTCFullYear(), courant.getUTCMonth() - i, 1));
    const cell = (d: DeviseKey) => ({
      fonds: Number(fonds12.find((f) => f.devise === d && moisCle(f.mois) === moisCle(m))?.montant ?? 0),
      dons: Number(dons12.find((x) => x.devise === d && moisCle(new Date(x.m)) === moisCle(m))?.total ?? 0),
    });
    return { m, USD: cell("USD"), CDF: cell("CDF") };
  });
  return { mois, precedent: new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() - 1, 1)), suivant, courant, dons, fondsMois, resume, historique };
}

export default async function FinancesPage(props: PageProps<"/gestion/finances">) {
  const user = await requireUser(ADMINS);
  const sp = await props.searchParams;
  const { mois, precedent, suivant, courant, dons, fondsMois, resume, historique } = await load(typeof sp.mois === "string" ? sp.mois : undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Dons reçus et fonds mensuels de la fondation" />

      <div className="flex items-center justify-between gap-3 rounded-3xl bg-white p-4">
        <Link href={`/gestion/finances?mois=${moisCle(precedent)}`} className="rounded-full px-4 py-2 font-semibold text-navy hover:bg-mist">← {moisLabel(precedent)}</Link>
        <h2 className="font-slab text-center text-2xl font-bold text-navy capitalize">{moisLabel(mois)}</h2>
        {suivant <= courant ? (
          <Link href={`/gestion/finances?mois=${moisCle(suivant)}`} className="rounded-full px-4 py-2 font-semibold text-navy hover:bg-mist">{moisLabel(suivant)} →</Link>
        ) : <span className="w-24" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {resume.map((r) => (
          <section key={r.devise} className="rounded-3xl bg-white p-6">
            <p className="font-semibold text-ink/70">{DEVISES[r.devise]}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-mist p-3"><dt className="text-sm text-ink/70">Fonds déclaré</dt><dd className="font-slab mt-1 text-xl font-bold text-navy">{formatMontant(r.fonds, r.devise)}</dd></div>
              <div className="rounded-2xl bg-mist p-3"><dt className="text-sm text-ink/70">Dons ({r.nb})</dt><dd className="font-slab mt-1 text-xl font-bold text-navy">{formatMontant(r.recus, r.devise)}</dd></div>
              <div className="rounded-2xl bg-navy p-3 text-white"><dt className="text-sm text-white/80">Total du mois</dt><dd className="font-slab mt-1 text-xl font-bold">{formatMontant(r.total, r.devise)}</dd></div>
            </dl>
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-1 text-xl font-bold text-navy">Fonds du mois</h2>
          {fondsMois.length === 0 ? (
            <p className="mb-4 text-ink/70">Aucun fonds déclaré pour {moisLabel(mois)}.</p>
          ) : (
            <ul className="mb-4 space-y-1 text-sm text-ink/80">
              {fondsMois.map((f) => <li key={f.id}><strong className="text-navy">{formatMontant(f.montant, f.devise)}</strong> — déclaré par {f.declarePar.name}, le {f.updatedAt.toLocaleDateString("fr-FR")}{f.note ? ` · ${f.note}` : ""}</li>)}
            </ul>
          )}
          {can.declarerFonds(user.role) ? (
            <AdminForm action={declarerFonds} submit="Déclarer le fonds">
              <div className="grid gap-3 sm:grid-cols-3">
                <Text name="mois" label="Mois" type="month" defaultValue={moisCle(mois)} max={moisCle(courant)} required />
                <DeviseSelect id="devise-fonds" />
                <Text name="montant" id="montant-fonds" label="Montant" inputMode="decimal" placeholder="ex. 2 000" required />
              </div>
              <Area name="note" id="note-fonds" label="Note (facultatif)" rows={2} placeholder="Origine du fonds, affectation…" />
              <p className="text-xs text-ink/70">Un seul fonds par mois et par devise : une nouvelle déclaration remplace la précédente.</p>
            </AdminForm>
          ) : (
            <p className="rounded-xl bg-mist p-3 text-sm text-ink/70">Seul un super administrateur peut déclarer le fonds mensuel.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-navy">Enregistrer un don</h2>
          <AdminForm action={addDon} resetOnSuccess submit="Enregistrer le don">
            <div className="grid gap-3 sm:grid-cols-3">
              <Text name="date" label="Date" type="date" defaultValue={today} max={today} required />
              <DeviseSelect id="devise-don" />
              <Text name="montant" id="montant-don" label="Montant" inputMode="decimal" placeholder="ex. 50" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Text name="donateur" label="Donateur (vide = anonyme)" />
              <Text name="telephone" label="Téléphone (facultatif)" type="tel" />
              <div>
                <label htmlFor="moyen" className={admLabel}>Moyen</label>
                <select id="moyen" name="moyen" defaultValue="MOBILE_MONEY" className={admInput}>
                  {Object.entries(MOYENS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <Text name="reference" label="Référence (n° transaction, reçu…)" />
            </div>
            <Area name="note" id="note-don" label="Note (facultatif)" rows={2} />
          </AdminForm>
        </section>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white">
        <h2 className="p-6 pb-3 text-xl font-bold text-navy">Dons de {moisLabel(mois)}</h2>
        {dons.length === 0 ? (
          <p className="px-6 pb-6 text-ink/70">Aucun don enregistré ce mois-ci.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-mist/60 text-ink/70">
                <tr>{["Date", "Donateur", "Montant", "Moyen", "Référence", "Saisi par", ""].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-navy/5">
                {dons.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{d.date.toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5">{d.donateur ?? <em className="text-ink/65">Anonyme</em>}{d.telephone && <span className="block text-xs text-ink/65">{d.telephone}</span>}</td>
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap text-navy">{formatMontant(d.montant, d.devise)}</td>
                    <td className="px-4 py-2.5">{MOYENS[d.moyen]}</td>
                    <td className="px-4 py-2.5">{d.reference}{d.note && <span className="block text-xs text-ink/65">{d.note}</span>}</td>
                    <td className="px-4 py-2.5 text-ink/70">{d.saisiPar.name}</td>
                    <td className="px-4 py-2.5">
                      {can.declarerFonds(user.role) && (
                        <form action={deleteDon.bind(null, d.id)}>
                          <ConfirmButton message="Supprimer définitivement ce don ?" className="font-semibold text-rouge-600 hover:underline">Supprimer</ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl bg-white">
        <h2 className="p-6 pb-3 text-xl font-bold text-navy">12 derniers mois</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-mist/60 text-ink/70">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Mois</th>
                {DEV.map((d) => [<th key={`f${d}`} className="px-4 py-2.5 text-right font-semibold">Fonds {d}</th>, <th key={`d${d}`} className="px-4 py-2.5 text-right font-semibold">Dons {d}</th>, <th key={`t${d}`} className="px-4 py-2.5 text-right font-semibold">Total {d}</th>])}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {historique.map((h) => (
                <tr key={moisCle(h.m)} className={moisCle(h.m) === moisCle(mois) ? "bg-mist/60" : ""}>
                  <td className="px-4 py-2.5"><Link href={`/gestion/finances?mois=${moisCle(h.m)}`} className="font-semibold text-navy capitalize hover:underline">{moisLabel(h.m)}</Link></td>
                  {DEV.map((d) => [
                    <td key={`f${d}`} className="px-4 py-2.5 text-right whitespace-nowrap">{formatMontant(h[d].fonds, d)}</td>,
                    <td key={`d${d}`} className="px-4 py-2.5 text-right whitespace-nowrap">{formatMontant(h[d].dons, d)}</td>,
                    <td key={`t${d}`} className="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-navy">{formatMontant(h[d].fonds + h[d].dons, d)}</td>,
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
