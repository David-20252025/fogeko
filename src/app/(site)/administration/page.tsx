import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Administration",
  description: "Les membres de l'administration de la Fondation Gekoko (FOGEKO).",
};

export default async function BoardPage() {
  const people = await db.dirigeant.findMany({ where: { publie: true }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] });

  return (
    <>
      <PageHero kicker="Notre équipe" title="L'administration" intro="Les femmes et les hommes qui conduisent la Fondation Gekoko au quotidien." image="/img/fondateur-assis.webp" />
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        {people.length === 0 ? (
          <p className="rounded-3xl bg-mist p-10 text-center text-lg">La liste des membres de l&apos;administration sera bientôt publiée.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {people.map((p, i) => (
              <li key={p.id}>
                <Reveal delay={(i % 4) * 80} className="h-full">
                  <article className="group h-full overflow-hidden rounded-3xl bg-mist">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <Image
                        src={p.photo}
                        alt={`${p.prenom} ${p.nom}, ${p.poste}`}
                        fill
                        loading={i < 2 ? "eager" : "lazy"}
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover object-top transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="border-t-4 border-ocre p-4 md:p-5">
                      <h2 className="text-lg leading-tight font-bold text-navy md:text-xl">
                        {p.prenom} {p.nom}
                        {p.postNom && <span className="block text-base font-semibold text-navy/80">{p.postNom}</span>}
                      </h2>
                      <p className="mt-2 text-sm font-semibold tracking-wide text-rouge-600 uppercase">{p.poste}</p>
                    </div>
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
