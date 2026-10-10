import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { Facebook, Mail, Phone, Pin, WhatsApp, YouTube } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { getSettings, phoneList, whatsappLink } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez la Fondation Gekoko (FOGEKO) à Limete / Kingabwa, Kinshasa : téléphone, WhatsApp, email.",
};

export default async function ContactPage() {
  const s = await getSettings();
  const lines = [
    { Icon: WhatsApp, label: "WhatsApp", value: "Écrire sur WhatsApp", href: whatsappLink(s.whatsapp) },
    ...phoneList(s.telephone).map((t) => ({ Icon: Phone, label: "Téléphone", value: t.label, href: t.href })),
    { Icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    { Icon: Pin, label: "Adresse", value: s.adresse },
  ];
  const socials = [
    { href: s.facebook, label: "Facebook", Icon: Facebook },
    { href: s.youtube, label: "YouTube", Icon: YouTube },
  ].filter((x) => x.href);

  return (
    <>
      <PageHero kicker="Contact" title="Parlons ensemble" intro="Une question, une proposition, un besoin dans votre quartier ? Écrivez-nous." />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1fr_1.3fr] md:px-6 md:py-20">
        <div>
          <ul className="space-y-3">
            {lines.map(({ Icon, label, value, href }) => {
              const body = (
                <>
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy text-white"><Icon className="size-5" /></span>
                  <span>
                    <span className="block text-sm text-ink/70">{label}</span>
                    <span className="block font-semibold text-navy">{value}</span>
                  </span>
                </>
              );
              return (
                <li key={href ?? label}>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="flex items-center gap-4 rounded-2xl bg-mist p-4 transition hover:bg-navy/10">{body}</a>
                  ) : (
                    <div className="flex items-center gap-4 rounded-2xl bg-mist p-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <a key={label} href={href!} target="_blank" rel="noopener" aria-label={label} className="grid size-12 place-items-center rounded-full bg-navy text-white hover:bg-rouge"><Icon /></a>
              ))}
            </div>
          )}
          <div className="mt-8 overflow-hidden rounded-3xl ring-1 ring-navy/10">
            <iframe
              title="Carte : Limete / Kingabwa, Kinshasa"
              src="https://www.openstreetmap.org/export/embed.html?bbox=15.30%2C-4.38%2C15.39%2C-4.31&layer=mapnik&marker=-4.345%2C15.345"
              loading="lazy"
              className="h-72 w-full"
            />
          </div>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
