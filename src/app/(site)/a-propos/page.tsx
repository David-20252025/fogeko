import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Star, Sprout } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "À propos",
  description: "Mission, vision et valeurs de la Fondation Gekoko (FOGEKO), et parcours de son fondateur Gérard Mulumba.",
};

export default async function AboutPage() {
  const [s, timeline] = await Promise.all([getSettings(), db.timelineEvent.findMany({ orderBy: { ordre: "asc" } })]);
  const valeurs = s.valeurs.split("·").map((v) => v.trim()).filter(Boolean);

  return (
    <>
      <PageHero kicker="À propos" title="La Fondation Gekoko" intro={s.mission} image="/img/fondateur-assis.webp" />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-16 md:grid-cols-3 md:px-6 md:py-24">
        {[
          { t: "Notre mission", d: s.mission, Icon: Heart, c: "bg-navy text-white" },
          { t: "Notre vision", d: s.vision, Icon: Sprout, c: "bg-mist" },
        ].map(({ t, d, Icon, c }) => (
          <article key={t} className={`rounded-3xl p-8 ${c}`}>
            <Icon className="size-8 text-rouge" />
            <h2 className="mt-5 text-2xl font-bold">{t}</h2>
            <p className="mt-3 text-lg opacity-90">{d}</p>
          </article>
        ))}
        <article className="rounded-3xl bg-mist p-8">
          <Star className="size-8 text-rouge" />
          <h2 className="mt-5 text-2xl font-bold">Nos valeurs</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {valeurs.map((v) => (
              <li key={v} className="rounded-full bg-white px-4 py-2 font-semibold text-navy ring-1 ring-navy/10">{v}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="overflow-hidden bg-mist">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:grid-cols-[1fr_1.2fr] md:px-6 md:py-24">
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 -rotate-3 rounded-[2rem] bg-rouge/15" aria-hidden />
            <Image src="/img/fondateur-sceptre.webp" alt="Gérard Mulumba, fondateur de la Fondation Gekoko" width={720} height={1080} sizes="(min-width: 768px) 24rem, 90vw" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover object-top shadow-2xl" />
          </div>
          <div>
            <p className="font-semibold tracking-[.2em] text-rouge-600 uppercase">Le fondateur</p>
            <h2 className="mt-3 text-4xl font-bold text-navy md:text-5xl">Gérard Mulumba</h2>
            <p className="mt-1 text-lg font-semibold text-ocre-700">« Gecoco Mulumba » · Fondateur et coordonnateur</p>
            <p className="mt-6 text-lg whitespace-pre-line">{s.fondateurBio}</p>
            <Link href="/administration" className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-navy px-6 py-3 font-semibold text-navy transition hover:bg-navy hover:text-white">
              Voir l&apos;équipe de l&apos;administration <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
      <div className="kuba" aria-hidden />

      {timeline.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
          <p className="font-semibold tracking-[.2em] text-rouge-600 uppercase">Parcours</p>
          <h2 className="mt-3 text-4xl font-bold text-navy md:text-5xl">Les grandes étapes</h2>
          <ol className="mt-10 border-l-4 border-ocre/40">
            {timeline.map((e) => (
              <li key={e.id} className="relative pb-10 pl-8 last:pb-0">
                <span className="absolute top-1 -left-[14px] grid size-6 place-items-center rounded-full bg-navy ring-4 ring-white">
                  <span className="size-2 rounded-full bg-rouge" />
                </span>
                {e.annee && <p className="font-slab text-lg font-bold text-ocre-700">{e.annee}</p>}
                <h3 className="text-2xl font-bold text-navy">{e.titre}</h3>
                {e.texte && <p className="mt-2 text-lg text-ink/80">{e.texte}</p>}
              </li>
            ))}
          </ol>
          <Link href="/adhesion" className="mt-14 inline-flex items-center gap-2 rounded-full bg-rouge-600 px-7 py-4 text-lg font-semibold text-white shadow-xl shadow-rouge/25 hover:bg-rouge-700">
            Rejoindre la fondation <ArrowUpRight className="size-5" />
          </Link>
        </section>
      )}
    </>
  );
}
