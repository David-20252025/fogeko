import Link from "next/link";
import { BarList, Columns } from "@/components/admin/charts";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatutBadge } from "@/components/admin/statut-badge";
import { CATEGORIES, formatNumero, photoUrl } from "@/lib/members";

const DAY = 86_400_000;
const WEEKS = 12;

// Chargement hors du composant : calculs datés à chaque requête
async function load() {
  const now = Date.now();
  const since = (d: number) => new Date(now - d * DAY);

  const [total, actifs, attente, week, prevWeek, byCat, byCommune, communes, recent, weekly] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { statut: "ACTIF" } }),
    db.member.count({ where: { statut: "EN_ATTENTE" } }),
    db.member.count({ where: { dateAdhesion: { gte: since(7) } } }),
    db.member.count({ where: { dateAdhesion: { gte: since(14), lt: since(7) } } }),
    db.member.groupBy({ by: ["categorie"], _count: true }),
    db.member.groupBy({ by: ["communeId"], _count: true, orderBy: { _count: { communeId: "desc" } } }),
    db.commune.findMany(),
    db.member.findMany({ orderBy: { dateAdhesion: "desc" }, take: 6, include: { commune: true } }),
    db.$queryRaw<{ semaine: Date; n: bigint }[]>`
      SELECT date_trunc('week', "dateAdhesion") AS semaine, count(*) AS n FROM "Member"
      WHERE "dateAdhesion" >= date_trunc('week', now()) - make_interval(weeks => ${WEEKS - 1}::int)
      GROUP BY 1`,
  ]);

  const communeName = new Map(communes.map((c) => [c.id, c.nom]));
  // 12 semaines complètes, y compris celles sans adhésion
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(monday.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    const n = weekly.find((w) => Math.abs(new Date(w.semaine).getTime() - d.getTime()) < DAY);
    const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return { label, title: `Semaine du ${label}`, value: Number(n?.n ?? 0) };
  });
  return { total, actifs, attente, week, delta: week - prevWeek, byCat, byCommune, communeName, recent, weeks };
}

export default async function Dashboard() {
  await requireUser();
  const { total, actifs, attente, week, delta, byCat, byCommune, communeName, recent, weeks } = await load();

  const cards = [
    { label: "Total des membres", value: total, sub: `${actifs} actifs`, dark: true },
    { label: "Nouveaux (7 jours)", value: week, sub: delta === 0 ? "comme la semaine passée" : `${delta > 0 ? "+" : ""}${delta} vs semaine passée` },
    { label: "En attente de validation", value: attente, sub: "à valider", href: "/gestion/membres?statut=EN_ATTENTE" },
    { label: "Communes représentées", value: byCommune.length, sub: "sur 24" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-6">
        <h1 className="font-slab text-3xl font-bold text-navy md:text-4xl">Tableau de bord</h1>
        <p className="mt-1 text-ink/70">Vue d&apos;ensemble des membres de la fondation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const body = (
            <>
              <p className={`font-medium ${c.dark ? "text-white/80" : "text-ink/70"}`}>{c.label}</p>
              <p className="font-slab mt-3 text-5xl font-bold">{c.value}</p>
              <p className={`mt-2 text-sm ${c.dark ? "text-ocre" : "text-ink/65"}`}>{c.sub}</p>
            </>
          );
          const cls = `block rounded-3xl p-6 ${c.dark ? "bg-gradient-to-br from-navy to-navy-700 text-white" : "bg-white text-navy"}`;
          return c.href ? <Link key={c.label} href={c.href} className={`${cls} transition hover:ring-2 hover:ring-navy/20`}>{body}</Link> : <div key={c.label} className={cls}>{body}</div>;
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl bg-white p-6">
          <h2 className="text-xl font-bold text-navy">Adhésions par semaine</h2>
          <p className="mb-6 text-sm text-ink/65">12 dernières semaines</p>
          <Columns rows={weeks} />
        </section>
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-6 text-xl font-bold text-navy">Par catégorie</h2>
          <BarList rows={(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).map((k) => ({ label: CATEGORIES[k], value: byCat.find((c) => c.categorie === k)?._count ?? 0 }))} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-6 text-xl font-bold text-navy">Communes les plus représentées</h2>
          {byCommune.length ? <BarList rows={byCommune.slice(0, 8).map((c) => ({ label: communeName.get(c.communeId) ?? "?", value: c._count }))} /> : <p className="text-ink/65">Aucun membre pour l&apos;instant.</p>}
        </section>
        <section className="rounded-3xl bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-navy">Dernières adhésions</h2>
            <Link href="/gestion/membres" className="rounded-full border-2 border-navy/10 px-4 py-1.5 text-sm font-semibold text-navy hover:border-navy">Tout voir</Link>
          </div>
          <ul className="divide-y divide-navy/5">
            {recent.map((m) => (
              <li key={m.id}>
                <Link href={`/gestion/membres/${m.id}`} className="flex items-center gap-3 py-3 hover:bg-mist/60">
                  {/* eslint-disable-next-line @next/next/no-img-element -- photo protégée servie par route authentifiée */}
                  <img src={photoUrl(m.photoThumb)} alt="" width={44} height={44} className="size-11 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy">{m.prenom} {m.nom}</span>
                    <span className="block text-sm text-ink/65">{formatNumero(m.numero)} · {CATEGORIES[m.categorie]} · {m.commune.nom}</span>
                  </span>
                  <StatutBadge statut={m.statut} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
