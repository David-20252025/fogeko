import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { admInput, admLabel, Area, Check, ImageField, Text } from "@/components/admin/fields";
import { can, EDITORS, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteArticle, saveArticle } from "../../content-actions";

export default async function ArticleEdit(props: PageProps<"/gestion/actualites/[id]">) {
  const user = await requireUser(EDITORS);
  const { id } = await props.params;
  const a = id === "nouveau" ? null : await db.article.findUnique({ where: { id: Number(id) || 0 } });
  if (id !== "nouveau" && !a) notFound();
  const categories = await db.newsCategory.findMany({ orderBy: { nom: "asc" } });

  return (
    <div className="space-y-4">
      <Link href="/gestion/actualites" className="inline-block font-semibold text-navy hover:text-rouge-600">← Actualités</Link>
      <section className="rounded-3xl bg-white p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <h1 className="font-slab text-3xl font-bold text-navy">{a ? "Modifier l'article" : "Nouvel article"}</h1>
          {a?.publie && <Link href={`/actualites/${a.slug}`} target="_blank" className="font-semibold text-navy underline">Voir sur le site ↗</Link>}
        </div>
        <AdminForm action={saveArticle.bind(null, a?.id ?? null)} submit={a ? "Enregistrer" : "Créer l'article"}>
          <Text name="titre" label="Titre" defaultValue={a?.titre} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categorieId" className={admLabel}>Catégorie</label>
              <select id="categorieId" name="categorieId" defaultValue={a?.categorieId} className={admInput}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}{c.visible ? "" : " (masquée)"}</option>)}
              </select>
            </div>
            <Text name="publieLe" label="Date de publication" type="date" defaultValue={(a?.publieLe ?? new Date()).toISOString().slice(0, 10)} />
          </div>
          <ImageField current={a?.image} required />
          <Area name="extrait" label="Résumé (affiché dans les listes et au partage WhatsApp/Facebook)" defaultValue={a?.extrait} rows={3} required />
          <Area name="contenu" label="Texte de l'article" defaultValue={a?.contenu} rows={12} hint="Les retours à la ligne sont conservés." />
          <Check name="publie" label="Publié sur le site" defaultChecked={a?.publie ?? true} />
        </AdminForm>
        {a && can.delete(user.role) && (
          <form action={deleteArticle.bind(null, a.id)} className="mt-8 border-t border-navy/5 pt-4">
            <ConfirmButton message="Supprimer définitivement cet article ?" className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer l&apos;article</ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}
