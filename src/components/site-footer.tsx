import Image from "next/image";
import Link from "next/link";
import { getSettings, phoneList, whatsappLink } from "@/lib/settings";
import { Facebook, Mail, Phone, Pin, WhatsApp, YouTube } from "./icons";
import { NAV } from "@/lib/nav";

export async function SiteFooter() {
  const s = await getSettings();
  const socials = [
    { href: s.facebook, label: "Facebook", Icon: Facebook },
    { href: s.youtube, label: "YouTube", Icon: YouTube },
    { href: whatsappLink(s.whatsapp), label: "WhatsApp", Icon: WhatsApp },
  ].filter((x) => x.href);

  return (
    <footer className="relative mt-auto overflow-hidden bg-navy text-white/80">
      <div className="kuba" aria-hidden />
      <Image src="/img/colombe.png" alt="" width={264} height={293} className="pointer-events-none absolute -right-10 bottom-0 w-72 opacity-[.06] brightness-0 invert" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <div className="inline-flex rounded-2xl bg-white p-3">
            <Image src="/img/logo.webp" alt="Fondation Gekoko — FOGEKO" width={103} height={80} className="h-20 w-auto" />
          </div>
          <p className="mt-5 max-w-sm">{s.mission}</p>
          <div className="mt-6 flex gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href!} target="_blank" rel="noopener" aria-label={label} className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-rouge">
                <Icon />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-slab text-lg font-bold text-white">Navigation</h2>
          <ul className="mt-3 space-y-0.5">
            {NAV.map((n) => (
              <li key={n.href}><Link href={n.href} className="inline-block py-1.5 hover:text-white">{n.label}</Link></li>
            ))}
            <li><Link href="/adhesion" className="inline-block py-1.5 font-semibold text-ocre hover:text-white">Adhésion en ligne</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="font-slab text-lg font-bold text-white">Nous joindre</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex gap-3"><Pin className="mt-0.5 size-5 shrink-0 text-ocre" />{s.adresse}</li>
            {phoneList(s.telephone).map((t) => (
              <li key={t.href}><a href={t.href} className="flex gap-3 hover:text-white"><Phone className="size-5 text-ocre" />{t.label}</a></li>
            ))}
            <li><a href={`mailto:${s.email}`} className="flex gap-3 hover:text-white"><Mail className="size-5 text-ocre" />{s.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-white/60 sm:flex-row sm:justify-between md:px-6">
          <p>© {new Date().getFullYear()} Fondation Gekoko (FOGEKO) · Kinshasa, RDC</p>
          <span className="flex gap-5">
            <Link href="/confidentialite" className="inline-block py-1.5 hover:text-white">Confidentialité</Link>
            <Link href="/gestion/connexion" className="inline-block py-1.5 hover:text-white">Connexion</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
