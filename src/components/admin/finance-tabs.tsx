import Link from "next/link";

const TABS = [
  ["bord", "Tableau de bord", "/gestion/finances"],
  ["dons", "Dons", "/gestion/finances/dons"],
  ["depenses", "Dépenses", "/gestion/finances/depenses"],
  ["paiements", "Paiements des membres", "/gestion/finances/paiements"],
  ["historique", "Historique", "/gestion/finances/historique"],
  ["rapports", "Rapports", "/gestion/finances/rapports"],
] as const;

export function FinanceTabs({ current, mois }: { current: (typeof TABS)[number][0]; mois?: string }) {
  return (
    <nav aria-label="Finances" className="flex gap-1 overflow-x-auto rounded-3xl bg-white p-2">
      {TABS.map(([id, label, href]) => (
        <Link key={id} href={mois && id !== "historique" && id !== "rapports" ? `${href}?mois=${mois}` : href} aria-current={id === current ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2.5 font-semibold transition ${id === current ? "bg-navy text-white" : "text-navy hover:bg-mist"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Mois choisi dans l'URL (?mois=2026-10), sinon le mois en cours ; liens précédent / suivant. */
export function moisCourant(param: unknown) {
  const now = new Date();
  const courant = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const m = typeof param === "string" ? /^(\d{4})-(0[1-9]|1[0-2])$/.exec(param) : null;
  const mois = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : courant;
  const decale = (n: number) => new Date(Date.UTC(mois.getUTCFullYear(), mois.getUTCMonth() + n, 1));
  return { mois, suivant: decale(1), precedent: decale(-1), courant };
}

export function MoisNav({ path, mois, precedent, suivant, courant }: { path: string } & ReturnType<typeof moisCourant>) {
  const cle = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-white p-3">
      <Link href={`${path}?mois=${cle(precedent)}`} className="rounded-full px-4 py-2 font-semibold text-navy hover:bg-mist">← <span className="hidden sm:inline">{label(precedent)}</span></Link>
      <h2 className="font-slab text-center text-xl font-bold text-navy capitalize md:text-2xl">{label(mois)}</h2>
      {suivant <= courant ? <Link href={`${path}?mois=${cle(suivant)}`} className="rounded-full px-4 py-2 font-semibold text-navy hover:bg-mist"><span className="hidden sm:inline">{label(suivant)}</span> →</Link> : <span className="w-10" />}
    </div>
  );
}
