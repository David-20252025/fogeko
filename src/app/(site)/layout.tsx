import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsApp } from "@/components/icons";
import { getSettings, whatsappLink } from "@/lib/settings";

export const dynamic = "force-dynamic"; // contenus lus en base à chaque requête (modifiables depuis l'admin)

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      <SiteHeader />
      <main id="contenu" className="flex-1">{children}</main>
      <SiteFooter />
      <a
        href={whatsappLink(s.whatsapp)}
        target="_blank"
        rel="noopener"
        aria-label="Écrire à la fondation sur WhatsApp"
        className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 transition hover:scale-105 md:right-6 md:bottom-6"
      >
        <WhatsApp className="size-7" />
      </a>
    </>
  );
}
