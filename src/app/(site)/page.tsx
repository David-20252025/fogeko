import Image from "next/image";
import Link from "next/link";
import { dateFr } from "@/components/page-hero";
import { CountUp, Reveal } from "@/components/reveal";
import { ArrowUpRight, Building, Heart, Sprout, Star, Users } from "@/components/icons";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

const CATEGORIES = [
  { key: "MAMAN", label: "Mamans" },
  { key: "PAPA", label: "Papas" },
  { key: "JEUNE", label: "Jeunes" },
  { key: "PASTEUR", label: "Pasteurs" },
];
const ACTION_ICONS = [Heart, Users, Building, Star];


export default async function HomePage() {
  const [s, actions, articles] = await Promise.all([
    getSettings(),
    db.action.findMany({ where: { publiee: true }, orderBy: { ordre: "asc" }, take: 4 }),
    db.article.findMany({
      where: { publie: true, publieLe: { lte: new Date() }, categorie: { visible: true } },
      orderBy: { publieLe: "desc" },
      take: 3,
      include: { categorie: true },
    }),
  ]);

  const stats = [
    { v: s.statMembres, l: "membres engagés", Icon: Users, c: "bg-navy text-white" },
    { v: s.statCommunes, l: "communes touchées", Icon: Building, c: "bg-mist text-navy" },
    { v: s.statActions, l: "actions menées", Icon: Sprout, c: "bg-mist text-navy" },
  ].filter((x) => x.v > 0);

  // Le dernier mot du titre est souligné par la courbe du logo
  const words = s.heroTitre.trim().split(" ");
  const last = words.pop();

  return (
    <>
      {/* ───── Héros ───── */}
      <section className="relative isolate overflow-hidden bg-navy text-white">
        <div className="absolute inset-x-0 top-0 h-[60%] md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[56%]">
          <Image
            src="/img/fondateur-portrait.webp"
            alt="Gérard Mulumba, fondateur de la Fondation Gekoko, en tenue traditionnelle"
            fill
            preload
            quality={60}
            sizes="(min-width: 768px) 56vw, 100vw"
            className="object-cover object-[50%_0%] md:object-[60%_18%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 via-45% to-navy/0 md:via-50% bg-gradient-to-r md:from-navy md:via-navy/40 md:to-transparent" />
        </div>
        <Image src="/img/colombe.png" alt="" width={264} height={293} aria-hidden className="anim-fly pointer-events-none absolute top-10 left-[-40px] -z-0 w-64 opacity-10 brightness-0 invert md:top-16 md:left-[30%] md:w-80" />

        <div className="relative mx-auto flex min-h-[calc(100svh-72px)] max-w-7xl items-end px-4 pt-40 pb-28 md:min-h-[calc(100svh-88px)] md:items-center md:px-6 md:pb-32">
          <div className="anim-rise max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <span className="size-2 rounded-full bg-rouge" /> Kinshasa · <span className="sm:hidden">RDC</span><span className="hidden sm:inline">République démocratique du Congo</span>
            </p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
              {words.join(" ")}{" "}
              <span className="relative inline-block whitespace-nowrap">
                {last}
                <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-rouge" aria-hidden>
                  <path d="M4 15C80 3 220 3 296 13" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85 md:text-xl">{s.heroSousTitre}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/adhesion" className="inline-flex items-center justify-center gap-2 rounded-full bg-rouge-600 px-7 py-4 text-lg font-semibold shadow-xl shadow-rouge/30 transition hover:bg-rouge-700">
                Rejoindre la fondation <ArrowUpRight className="size-5" />
              </Link>
              <Link href="/actions" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/70 px-7 py-4 text-lg font-semibold transition hover:bg-white hover:text-navy">
                Nos actions
              </Link>
            </div>
          </div>
        </div>
        <div className="kuba absolute inset-x-0 bottom-0" aria-hidden />
      </section>

      {/* ───── Carte d'adhésion rapide (chevauche le héros) ───── */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 md:px-6">
        <div className="grid gap-5 rounded-3xl bg-white p-6 shadow-[0_30px_60px_-30px_rgba(10,19,96,.45)] ring-1 ring-navy/5 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-8 md:p-8">
          <p className="font-slab text-2xl leading-tight font-bold text-navy">
            Je rejoins
            <br className="hidden md:block" /> <span className="text-rouge">la famille FOGEKO</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={`/adhesion?categorie=${c.key}`} className="rounded-2xl border-2 border-navy/10 px-4 py-3.5 text-center font-semibold text-navy transition hover:border-navy hover:bg-navy hover:text-white">
                {c.label}
              </Link>
            ))}
          </div>
          <Link href="/adhesion" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy px-6 py-4 font-semibold text-white transition hover:bg-navy-700">
            Adhérer en ligne <ArrowUpRight />
          </Link>
        </div>
      </section>

      {/* ───── Chiffres clés (un chiffre à 0 n'est pas affiché) ───── */}
      {stats.length > 0 && (
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-24">
        <div className={`grid gap-3 sm:gap-5 ${["", "grid-cols-1", "grid-cols-2", "grid-cols-3"][stats.length]}`}>
          {stats.map(({ v, l, Icon, c }, i) => (
            <Reveal key={l} delay={i * 120}>
              <div className={`relative h-full overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7 ${c}`}>
                <Icon className="size-6 opacity-80 sm:size-8" />
                <p className="font-slab mt-3 text-3xl font-bold sm:mt-6 sm:text-6xl"><CountUp value={v} />+</p>
                <p className="mt-1 text-sm leading-tight opacity-80 sm:text-lg">{l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* ───── Présentation ───── */}
      <section className="overflow-hidden bg-mist">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rotate-3 rounded-[2rem] bg-ocre/25" aria-hidden />
            <Image src="/img/fondateur-hommage.webp" alt="Des membres saluent le fondateur lors d'une cérémonie" width={720} height={1080} sizes="(min-width: 768px) 28rem, 90vw" className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl" />
            <div className="absolute -right-4 -bottom-6 grid size-28 place-items-center rounded-full bg-navy ring-8 ring-mist md:-right-8">
              <Image src="/img/colombe.png" alt="" width={56} height={62} className="w-14 brightness-0 invert" aria-hidden />
            </div>
          </div>
          <div>
            <p className="font-semibold tracking-[.2em] text-rouge-600 uppercase">Qui sommes-nous</p>
            <h2 className="mt-3 text-4xl leading-tight font-bold text-navy md:text-5xl">Une fondation au service des quartiers</h2>
            <p className="mt-6 text-lg">{s.mission}</p>
            <p className="mt-4 text-lg">{s.vision}</p>
            <p className="mt-6 border-l-4 border-ocre pl-4 font-medium text-navy">{s.fondateurBio}</p>
            <Link href="/a-propos" className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-navy px-6 py-3 font-semibold text-navy transition hover:bg-navy hover:text-white">
              Découvrir la fondation <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>
      <div className="kuba" aria-hidden />

      {/* ───── Actions ───── */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-semibold tracking-[.2em] text-rouge-600 uppercase">Sur le terrain</p>
            <h2 className="mt-3 text-4xl font-bold text-navy md:text-5xl">Nos actions</h2>
          </div>
          <Link href="/actions" className="inline-flex items-center gap-2 font-semibold text-navy hover:text-rouge-600">Toutes les actions <ArrowUpRight /></Link>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a, i) => {
            const Icon = ACTION_ICONS[i % ACTION_ICONS.length];
            return (
              <Reveal key={a.id} delay={i * 100}>
                <Link href={`/actions#${a.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-mist transition duration-300 hover:-translate-y-1 hover:bg-navy hover:shadow-2xl hover:shadow-navy/30">
                  <div className="relative aspect-[4/3]">
                    <div className="absolute inset-0 overflow-hidden">
                      <Image src={a.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" loading="lazy" className="object-cover object-top transition duration-500 group-hover:scale-105" />
                    </div>
                    <span className="absolute bottom-0 left-5 grid size-12 translate-y-1/2 place-items-center rounded-2xl bg-white text-rouge shadow-lg"><Icon /></span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 pt-9">
                    <h3 className="text-xl font-bold text-navy group-hover:text-white">{a.titre}</h3>
                    <p className="mt-2 flex-1 text-[15px] text-ink/75 group-hover:text-white/80">{a.resume}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-rouge-600 group-hover:text-ocre">En savoir plus <ArrowUpRight /></span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ───── Actualités ───── */}
      {articles.length > 0 && (
        <section className="bg-mist">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="font-semibold tracking-[.2em] text-rouge-600 uppercase">Actualités</p>
                <h2 className="mt-3 text-4xl font-bold text-navy md:text-5xl">Les dernières nouvelles</h2>
              </div>
              <Link href="/actualites" className="inline-flex items-center gap-2 font-semibold text-navy hover:text-rouge-600">Toutes les actualités <ArrowUpRight /></Link>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-[1.25fr_1fr]">
              {articles.map((a, i) => (
                <Link key={a.id} href={`/actualites/${a.slug}`} className={`group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-navy/5 transition hover:shadow-xl ${i === 0 ? "md:row-span-2" : "sm:grid sm:grid-cols-[2fr_3fr]"}`}>
                  <div className={`relative overflow-hidden ${i === 0 ? "aspect-[16/11]" : "aspect-[16/10] sm:aspect-auto sm:h-full"}`}>
                    <Image src={a.image} alt="" fill loading="lazy" sizes={i === 0 ? "(min-width: 768px) 55vw, 100vw" : "(min-width: 768px) 20vw, 100vw"} className="object-cover object-top transition duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-ink/70">
                      <span className="font-semibold text-ocre-700">{a.categorie.nom}</span> · {dateFr(a.publieLe)}
                    </p>
                    <h3 className={`mt-2 font-bold text-navy group-hover:text-rouge-600 ${i === 0 ? "text-3xl" : "text-xl"}`}>{a.titre}</h3>
                    <p className={`mt-3 text-ink/75 ${i === 0 ? "" : "line-clamp-2"}`}>{a.extrait}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───── Appel final ───── */}
      <section className="relative isolate overflow-hidden bg-navy-900 text-white">
        <Image src="/img/fondateur-peau.webp" alt="" fill loading="lazy" sizes="100vw" className="-z-10 object-cover object-[50%_30%] opacity-30" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-900 via-navy/90 to-navy/50" />
        <div className="kuba" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="max-w-2xl">
            <h2 className="text-4xl leading-tight font-bold md:text-6xl">Votre quartier a besoin de vous.</h2>
            <p className="mt-5 text-lg text-white/85 md:text-xl">
              Mamans, papas, jeunes, pasteurs : l&apos;adhésion est simple, en ligne et prend quelques minutes.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/adhesion" className="inline-flex items-center justify-center gap-2 rounded-full bg-rouge-600 px-7 py-4 text-lg font-semibold shadow-xl shadow-rouge/30 transition hover:bg-rouge-700">
                Rejoindre la fondation <ArrowUpRight className="size-5" />
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-2 border-white/70 px-7 py-4 text-lg font-semibold transition hover:bg-white hover:text-navy">
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
