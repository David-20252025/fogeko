import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { dateFr, PageHero } from "@/components/page-hero";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Actualités",
  description: "Les dernières nouvelles de la Fondation Gekoko (FOGEKO) à Kinshasa.",
};

const PER_PAGE = 9;

export default async function NewsPage(props: PageProps<"/actualites">) {
  const sp = await props.searchParams;
  const cat = typeof sp.categorie === "string" ? sp.categorie : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where = { publie: true, publieLe: { lte: new Date() }, categorie: { visible: true, ...(cat && { slug: cat }) } };
  const [categories, articles, total] = await Promise.all([
    db.newsCategory.findMany({ where: { visible: true, articles: { some: { publie: true } } }, orderBy: { nom: "asc" } }),
    db.article.findMany({ where, orderBy: { publieLe: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { categorie: true } }),
    db.article.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);
  const href = (p: { categorie?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (p.categorie) q.set("categorie", p.categorie);
    if (p.page && p.page > 1) q.set("page", String(p.page));
    return `/actualites${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <PageHero kicker="Actualités" title="La vie de la fondation" intro="Rencontres, actions sur le terrain et annonces de la Fondation Gekoko." image="/img/fondateur-sceptre.webp" />

      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        {categories.length > 1 && (
          <nav aria-label="Catégories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {[{ slug: undefined, nom: "Toutes" }, ...categories].map((c) => {
              const active = c.slug === cat;
              return (
                <Link key={c.nom} href={href({ categorie: c.slug })} aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-full px-5 py-2.5 font-semibold transition ${active ? "bg-navy text-white" : "bg-mist text-navy hover:bg-navy/10"}`}>
                  {c.nom}
                </Link>
              );
            })}
          </nav>
        )}

        {articles.length === 0 ? (
          <p className="mt-10 rounded-3xl bg-mist p-10 text-center text-lg">Aucune actualité pour le moment.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link key={a.id} href={`/actualites/${a.slug}`} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-navy/10 transition hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image src={a.image} alt="" fill loading="lazy" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover object-top transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <p className="text-sm text-ink/70"><span className="font-semibold text-ocre-700">{a.categorie.nom}</span> · {dateFr(a.publieLe)}</p>
                  <h2 className="mt-2 text-xl font-bold text-navy group-hover:text-rouge-600">{a.titre}</h2>
                  <p className="mt-3 line-clamp-3 text-ink/75">{a.extrait}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex justify-center gap-2">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link key={p} href={href({ categorie: cat, page: p })} aria-current={p === page ? "page" : undefined}
                className={`grid size-11 place-items-center rounded-full font-semibold ${p === page ? "bg-navy text-white" : "bg-mist text-navy hover:bg-navy/10"}`}>
                {p}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
