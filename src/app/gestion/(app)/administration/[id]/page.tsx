import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Check, ImageField, Text } from "@/components/admin/fields";
import { can, EDITORS, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteDirigeant, saveDirigeant } from "../../content-actions";

export default async function BoardEdit(props: PageProps<"/gestion/administration/[id]">) {
  const user = await requireUser(EDITORS);
  const { id } = await props.params;
  const p = id === "nouveau" ? null : await db.dirigeant.findUnique({ where: { id: Number(id) || 0 } });
  if (id !== "nouveau" && !p) notFound();

  return (
    <div className="space-y-4">
      <Link href="/gestion/administration" className="inline-block font-semibold text-navy hover:text-rouge-600">← Administration</Link>
      <section className="rounded-3xl bg-white p-6">
        <h1 className="font-slab mb-6 text-3xl font-bold text-navy">{p ? "Modifier" : "Ajouter une personne"}</h1>
        <AdminForm action={saveDirigeant.bind(null, p?.id ?? null)} submit={p ? "Enregistrer" : "Publier"}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Text name="nom" label="Nom" defaultValue={p?.nom} required />
            <Text name="postNom" label="Post-nom" defaultValue={p?.postNom ?? ""} />
            <Text name="prenom" label="Prénom" defaultValue={p?.prenom} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-[3fr_1fr]">
            <Text name="poste" label="Poste" defaultValue={p?.poste} required placeholder="ex. Secrétaire général, Trésorière, Chargé de la jeunesse…" />
            <Text name="ordre" label="Ordre d'affichage" type="number" min={0} defaultValue={p?.ordre ?? 0} hint="0 = en premier" />
          </div>
          <ImageField label="Photo (de préférence en portrait, visage bien visible)" current={p?.photo} required />
          <Check name="publie" label="Afficher sur le site" defaultChecked={p?.publie ?? true} />
        </AdminForm>
        {p && can.delete(user.role) && (
          <form action={deleteDirigeant.bind(null, p.id)} className="mt-8 border-t border-navy/5 pt-4">
            <ConfirmButton message={`Retirer ${p.prenom} ${p.nom} de l'administration ?`} className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer</ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}
