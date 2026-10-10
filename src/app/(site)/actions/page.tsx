import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nos actions",
  description: "Action sociale, développement communautaire, infrastructures à Kingabwa/Limete et projet Tshilejelu : les actions de la Fondation Gekoko.",
};

export default async function ActionsPage() {
  const actions = await db.action.findMany({ where: { publiee: true }, orderBy: { ordre: "asc" } });

  return (
    <>
      <PageHero kicker="Sur le terrain" title="Nos actions" intro="Des actions concrètes, au plus près des familles et des quartiers de Kinshasa." image="/img/fondateur-hommage.webp" />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-16 md:space-y-16 md:px-6 md:py-24">
        {actions.map((a, i) => (
          <Reveal key={a.id}>
            <article id={a.slug} className="grid scroll-mt-28 items-center gap-8 overflow-hidden rounded-[2rem] bg-mist md:grid-cols-2 md:gap-0">
              <div className={`relative aspect-[4/3] md:aspect-auto md:h-full md:min-h-[420px] ${i % 2 ? "md:order-2" : ""}`}>
                <Image src={a.image} alt="" fill loading="lazy" sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-[50%_30%]" />
              </div>
              <div className="px-6 pb-8 md:p-12">
                <p data-n={String(i + 1).padStart(2, "0")} className="font-slab text-5xl font-bold text-ocre/40 before:content-[attr(data-n)]" />
                <h2 className="mt-2 text-3xl font-bold text-navy md:text-4xl">{a.titre}</h2>
                <p className="mt-4 text-lg font-medium text-ink/90">{a.resume}</p>
                {a.contenu !== a.resume && <p className="mt-4 text-lg whitespace-pre-line text-ink/75">{a.contenu}</p>}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <section className="bg-navy text-white">
        <div className="kuba" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-6">
          <h2 className="text-3xl font-bold md:text-4xl">Vous voulez agir avec nous ?</h2>
          <Link href="/adhesion" className="inline-flex items-center gap-2 rounded-full bg-rouge-600 px-7 py-4 text-lg font-semibold hover:bg-rouge-700">
            Rejoindre la fondation <ArrowUpRight className="size-5" />
          </Link>
        </div>
      </section>
    </>
  );
}
