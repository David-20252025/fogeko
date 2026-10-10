"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { ArrowUpRight, Close, Menu, UserIcon } from "./icons";

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow ${scrolled ? "shadow-[0_6px_24px_-12px_rgba(10,19,96,.35)]" : ""}`}>
      <div className="kuba kuba-thin" aria-hidden />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-20 md:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="FOGEKO — accueil">
          <Image src="/img/logo.webp" alt="" width={72} height={56} loading="eager" className="h-11 w-auto md:h-14" />
          <span className="hidden leading-none sm:block lg:hidden xl:block">
            <span className="font-slab block text-xl font-bold text-rouge">FOGEKO</span>
            <span className="block text-[11px] font-semibold tracking-[.18em] text-navy uppercase">Fondation Gekoko</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-[15px] font-medium whitespace-nowrap transition-colors xl:px-4 ${active ? "bg-navy text-white" : "text-ink hover:bg-mist hover:text-navy"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/connexion"
            aria-label="Connexion à l'espace de gestion"
            title="Connexion"
            className="inline-flex size-11 items-center justify-center gap-1.5 rounded-full border-2 border-navy/15 text-[15px] font-semibold text-navy transition hover:border-navy xl:size-auto xl:px-4 xl:py-2"
          >
            <UserIcon />
            <span className="hidden xl:inline">Connexion</span>
          </Link>
          <Link href="/adhesion" className="hidden items-center gap-1.5 rounded-full bg-rouge-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-lg shadow-rouge/25 transition hover:bg-rouge-700 sm:inline-flex">
            Adhérer <ArrowUpRight />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid size-11 place-items-center rounded-full text-navy hover:bg-mist lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 top-[72px] bottom-0 overflow-y-auto bg-white px-4 pb-10 lg:hidden">
          <nav className="flex flex-col divide-y divide-navy/10" aria-label="Navigation mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="font-slab py-4 text-2xl font-semibold text-navy">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/adhesion" onClick={() => setOpen(false)} className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-rouge-600 py-4 text-lg font-semibold text-white">
            Rejoindre la fondation <ArrowUpRight className="size-5" />
          </Link>
          <Link href="/connexion" onClick={() => setOpen(false)} className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-navy/15 py-4 text-lg font-semibold text-navy">
            <UserIcon /> Connexion
          </Link>
          <div className="kuba mt-8 rounded" aria-hidden />
        </div>
      )}
    </header>
  );
}
