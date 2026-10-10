import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Facebook, WhatsApp } from "@/components/icons";
import { dateFr } from "@/components/page-hero";
import { db } from "@/lib/db";

const getArticle = cache((slug: string) =>
  db.article.findFirst({
    where: { slug, publie: true, publieLe: { lte: new Date() }, categorie: { visible: true } },
    include: { categorie: true },
  }),
);

export async function generateMetadata(props: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const a = await getArticle((await props.params).slug);
  if (!a) return {};
  return {
    title: a.titre,
    description: a.extrait,
    openGraph: { type: "article", title: a.titre, description: a.extrait, images: [a.image], publishedTime: a.publieLe.toISOString() },
  };
}

export default async function ArticlePage(props: PageProps<"/actualites/[slug]">) {
  const a = await getArticle((await props.params).slug);
  if (!a) notFound();

  const url = `${process.env.SITE_URL ?? "https://fogeko.com"}/actualites/${a.slug}`;
  const share = [
    { label: "Partager sur WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${a.titre} ${url}`)}`, Icon: WhatsApp, c: "bg-[#0F7A4A]" },
    { label: "Partager sur Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, Icon: Facebook, c: "bg-[#0866FF]" },
  ];

  return (
    <article>
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-32 md:px-6 md:pt-16">
          <nav aria-label="Fil d'Ariane" className="text-sm text-white/60">
            <Link href="/" className="inline-block py-2 hover:text-white">Accueil</Link> / <Link href="/actualites" className="inline-block py-2 hover:text-white">Actualités</Link>
          </nav>
          <p className="mt-6 text-sm"><span className="font-semibold text-ocre">{a.categorie.nom}</span> · <time dateTime={a.publieLe.toISOString()}>{dateFr(a.publieLe)}</time></p>
          <h1 className="mt-3 text-4xl leading-tight font-bold md:text-5xl">{a.titre}</h1>
        </div>
      </header>
      <div className="mx-auto -mt-24 max-w-4xl px-4 md:px-6">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] shadow-2xl">
          <Image src={a.image} alt="" fill preload sizes="(min-width: 896px) 896px, 100vw" className="object-cover object-top" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <p className="text-xl font-medium text-navy">{a.extrait}</p>
        <div className="mt-6 text-lg leading-relaxed whitespace-pre-line text-ink/85">{a.contenu}</div>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-navy/10 pt-8">
          <span className="font-semibold text-navy">Partager :</span>
          {share.map(({ label, href, Icon, c }) => (
            <a key={label} href={href} target="_blank" rel="noopener" className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white ${c}`}>
              <Icon className="size-5" /> {label.replace("Partager sur ", "")}
            </a>
          ))}
        </div>
        <Link href="/actualites" className="mt-10 inline-block font-semibold text-navy hover:text-rouge-600">← Toutes les actualités</Link>
      </div>
      <div className="kuba" aria-hidden />
    </article>
  );
}
