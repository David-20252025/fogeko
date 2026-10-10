import Image from "next/image";
import Link from "next/link";

export function PageHero({ title, kicker, intro, image }: { title: string; kicker: string; intro?: string; image?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      {image && (
        <>
          {/* Décor discret : affiché à partir de la tablette ; en lazy + display:none, le téléphone ne le télécharge pas */}
          <Image src={image} alt="" fill sizes="100vw" className="-z-10 hidden object-cover object-[50%_25%] opacity-25 md:block" />
          <div className="absolute inset-0 -z-10 hidden bg-gradient-to-r from-navy via-navy/90 to-navy/40 md:block" />
        </>
      )}
      <Image src="/img/colombe.png" alt="" width={264} height={293} aria-hidden className="pointer-events-none absolute -right-8 -bottom-10 -z-10 hidden w-56 opacity-10 brightness-0 invert md:right-16 md:block md:w-72" />
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-16 md:px-6 md:pt-20 md:pb-24">
        <nav aria-label="Fil d'Ariane" className="text-sm text-white/60">
          <Link href="/" className="inline-block py-2 hover:text-white">Accueil</Link> <span aria-hidden>/</span> <span className="text-white/90">{title}</span>
        </nav>
        <p className="mt-6 font-semibold tracking-[.2em] text-ocre uppercase">{kicker}</p>
        <h1 className="mt-2 max-w-3xl text-4xl leading-tight font-bold md:text-6xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-white/85">{intro}</p>}
      </div>
      <div className="kuba" aria-hidden />
    </section>
  );
}

export const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
