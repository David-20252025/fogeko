import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/members";
import { MODULES } from "@/lib/permissions";
import { logout } from "../actions";

export default async function AdminLayout({ children }: LayoutProps<"/gestion">) {
  const user = await requireUser();
  const unread = user.perms.MESSAGES.voir ? await db.contactMessage.count({ where: { lu: false } }) : 0;
  // Administration reste visible pour le super admin (comptes, rôles, journal, paramètres)
  const visible = MODULES.filter((m) => user.perms[m.key].voir || (m.key === "ADMINISTRATION" && user.role.superAdmin)).map((m) => m.key);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-3 lg:flex-row lg:p-5">
      <aside className="shrink-0 rounded-3xl bg-white p-4 lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:w-64 lg:flex-col lg:p-5 print:hidden">
        <div className="flex items-center justify-between lg:block">
          <Link href="/gestion" className="flex items-center gap-2.5">
            <Image src="/img/logo.webp" alt="" width={57} height={44} className="h-11 w-auto" />
            <span className="font-slab text-xl font-bold text-rouge">FOGEKO</span>
          </Link>
          <Link href="/" target="_blank" className="text-sm font-semibold text-navy lg:hidden">Voir le site ↗</Link>
        </div>
        <p className="mt-6 mb-2 hidden px-3.5 text-xs font-semibold tracking-widest text-ink/65 uppercase lg:block">Menu</p>
        <div className="mt-4 lg:mt-0"><AdminNav visible={visible} unread={unread} utilisateurs={user.role.superAdmin} /></div>
        <div className="mt-auto hidden lg:block">
          <div className="relative overflow-hidden rounded-2xl bg-navy p-4 text-white">
            <Image src="/img/colombe.png" alt="" width={264} height={293} className="absolute -right-4 -bottom-4 w-20 opacity-15 brightness-0 invert" />
            <p className="font-slab text-lg font-bold">Le site public</p>
            <Link href="/" target="_blank" className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy">Ouvrir ↗</Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-3xl bg-white px-5 py-3 print:hidden">
          {user.perms.MEMBRES.voir && <form action="/gestion/membres" className="relative hidden max-w-sm flex-1 sm:block">
            <svg viewBox="0 0 24 24" className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink/65" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input name="q" type="search" placeholder="Rechercher un membre (nom, téléphone)…" aria-label="Rechercher un membre" className="w-full rounded-full bg-mist py-2.5 pr-4 pl-11 outline-none focus:ring-2 focus:ring-navy/20" />
          </form>}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/gestion/profil" className="flex items-center gap-3 rounded-full py-1 pr-1 hover:bg-mist" title="Mon profil">
              <span className="text-right leading-tight">
                <span className="block font-semibold text-navy">{user.name}</span>
                <span className="block text-sm text-ink/65">{user.role.nom}</span>
              </span>
              {user.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo protégée
                <img src={photoUrl(user.photo)} alt="" className="size-10 rounded-full object-cover" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full bg-mist font-bold text-navy">{user.name[0]}</span>
              )}
            </Link>
            <form action={logout}>
              <button className="rounded-full border-2 border-navy/10 px-4 py-2 text-sm font-semibold text-navy hover:border-navy">Déconnexion</button>
            </form>
          </div>
        </header>
        {!user.photo && (
          <p className="mb-4 rounded-2xl bg-ocre/15 px-5 py-3 font-medium text-ink print:hidden">
            La photo de profil est obligatoire. <Link href="/gestion/profil" className="font-semibold text-navy underline">Ajoutez la vôtre</Link>.
          </p>
        )}
        <main>{children}</main>
      </div>
    </div>
  );
}
