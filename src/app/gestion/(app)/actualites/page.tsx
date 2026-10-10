import Image from "next/image";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Check, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { addCategory, deleteCategory, toggleCategory } from "../content-actions";

export default async function NewsAdmin() {
  const user = await requirePerm("ACTUALITES");
  const [articles, categories] = await Promise.all([
    db.article.findMany({ orderBy: { publieLe: "desc" }, include: { categorie: true } }),
    db.newsCategory.findMany({ orderBy: { nom: "asc" }, include: { _count: { select: { articles: true } } } }),
  ]);

  return (
    <div className="space-y-4">
      <PageHead title="Actualités" sub={`${articles.length} article(s)`} action={user.perms.ACTUALITES.creer ? { href: "/gestion/actualites/nouveau", label: "+ Nouvel article" } : undefined} />
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <ul className="h-fit divide-y divide-navy/5 overflow-hidden rounded-3xl bg-white">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/gestion/actualites/${a.id}`} className="flex items-center gap-4 p-4 hover:bg-mist/60">
                <Image src={a.image} alt="" width={160} height={100} className="h-16 w-24 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-navy">{a.titre}</span>
                  <span className="block text-sm text-ink/65">{a.categorie.nom} · {a.publieLe.toLocaleDateString("fr-FR")}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${a.publie && a.categorie.visible ? "bg-emerald-50 text-emerald-700" : "bg-mist text-ink/70"}`}>
                  {!a.publie ? "Brouillon" : a.categorie.visible ? "En ligne" : "Catégorie masquée"}
                </span>
              </Link>
            </li>
          ))}
          {articles.length === 0 && <li className="p-10 text-center text-ink/70">Aucun article.</li>}
        </ul>

        <aside className="h-fit rounded-3xl bg-white p-6">
          <h2 className="text-xl font-bold text-navy">Catégories</h2>
          <p className="mt-1 text-sm text-ink/70">Une catégorie masquée cache tous ses articles du site (ex. contenus politiques en attente de validation).</p>
          <ul className="mt-4 space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2">
                <span className="flex-1 font-medium">{c.nom} <span className="text-sm text-ink/65">({c._count.articles})</span></span>
                <form action={toggleCategory.bind(null, c.id)} className={user.perms.ACTUALITES.modifier ? "" : "pointer-events-none opacity-70"}>
                  <button className={`rounded-full px-3 py-1 text-xs font-semibold ${c.visible ? "bg-emerald-600 text-white" : "bg-white text-ink/70 ring-1 ring-navy/10"}`} title="Changer la visibilité">
                    {c.visible ? "Visible" : "Masquée"}
                  </button>
                </form>
                {user.perms.ACTUALITES.supprimer && c._count.articles === 0 && (
                  <form action={deleteCategory.bind(null, c.id)}>
                    <ConfirmButton message={`Supprimer la catégorie « ${c.nom} » ?`} className="px-1 text-rouge-600">✕</ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {user.perms.ACTUALITES.creer && <div className="mt-5 border-t border-navy/5 pt-5">
            <AdminForm resetOnSuccess action={addCategory} submit="Ajouter">
              <Text name="nom" label="Nouvelle catégorie" required />
              <Check name="visible" label="Visible sur le site" defaultChecked />
            </AdminForm>
          </div>}
        </aside>
      </div>
    </div>
  );
}
