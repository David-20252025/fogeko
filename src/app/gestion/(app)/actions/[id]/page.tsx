import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Area, Check, ImageField, Text } from "@/components/admin/fields";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAction, saveAction } from "../../content-actions";

export default async function ActionEdit(props: PageProps<"/gestion/actions/[id]">) {
  const { id } = await props.params;
  const user = await requirePerm("ACTIONS", id === "nouveau" ? "creer" : "modifier");
  const a = id === "nouveau" ? null : await db.action.findUnique({ where: { id: Number(id) || 0 } });
  if (id !== "nouveau" && !a) notFound();

  return (
    <div className="space-y-4">
      <Link href="/gestion/actions" className="inline-block font-semibold text-navy hover:text-rouge-600">← Actions</Link>
      <section className="rounded-3xl bg-white p-6">
        <h1 className="font-slab mb-6 text-3xl font-bold text-navy">{a ? "Modifier l'action" : "Nouvelle action"}</h1>
        <AdminForm action={saveAction.bind(null, a?.id ?? null)} submit={a ? "Enregistrer" : "Créer l'action"}>
          <div className="grid gap-4 md:grid-cols-[3fr_1fr]">
            <Text name="titre" label="Titre" defaultValue={a?.titre} required />
            <Text name="ordre" label="Ordre d'affichage" type="number" min={0} defaultValue={a?.ordre ?? 0} />
          </div>
          <ImageField current={a?.image} required />
          <Area name="resume" label="Résumé (cartes de l'accueil)" defaultValue={a?.resume} rows={3} required />
          <Area name="contenu" label="Description détaillée (page Actions)" defaultValue={a?.contenu} rows={8} />
          <Check name="publiee" label="Afficher sur le site" defaultChecked={a?.publiee ?? true} />
        </AdminForm>
        {a && user.perms.ACTIONS.supprimer && (
          <form action={deleteAction.bind(null, a.id)} className="mt-8 border-t border-navy/5 pt-4">
            <ConfirmButton message="Supprimer définitivement cette action ?" className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer l&apos;action</ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}
