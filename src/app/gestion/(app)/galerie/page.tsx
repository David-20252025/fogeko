import Image from "next/image";
import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ImageField, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { videoEmbed } from "@/lib/video";
import { addGalleryItem, deleteGalleryItem, updateGalleryItem } from "../content-actions";

export default async function GalleryAdmin() {
  const user = await requirePerm("GALERIE");
  const items = await db.galleryItem.findMany({ orderBy: [{ ordre: "asc" }, { date: "desc" }] });

  return (
    <div className="space-y-4">
      <PageHead title="Galerie" sub={`${items.length} élément(s) · ordre croissant sur le site`} />

      {user.perms.GALERIE.creer && <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-navy">Ajouter une photo ou une vidéo</h2>
        <AdminForm resetOnSuccess action={addGalleryItem} submit="Ajouter à la galerie">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <Text name="titre" label="Titre / description" required />
            <Text name="ordre" label="Ordre" type="number" min={0} defaultValue={0} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ImageField label="Photo" />
            <Text name="videoUrl" label="… ou lien vidéo YouTube / Facebook" placeholder="https://www.youtube.com/watch?v=…" hint="Les vidéos ne sont pas hébergées sur le serveur, elles sont intégrées." />
          </div>
        </AdminForm>
      </section>}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => {
          const thumb = it.type === "PHOTO" ? it.image : it.videoUrl ? videoEmbed(it.videoUrl)?.thumb : undefined;
          return (
            <li key={it.id} className="overflow-hidden rounded-3xl bg-white">
              <div className="relative aspect-video bg-navy">
                {thumb && it.type === "PHOTO" && <Image src={thumb} alt="" fill sizes="(min-width: 1280px) 30vw, 50vw" className="object-cover" />}
                {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube distante */}
                {thumb && it.type === "VIDEO" && <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />}
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-navy">{it.type === "PHOTO" ? "Photo" : "Vidéo"}</span>
              </div>
              <div className="p-4">
                <AdminForm action={updateGalleryItem.bind(null, it.id)} className="grid gap-3" readOnly={!user.perms.GALERIE.modifier}>
                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <Text name="titre" id={`titre-${it.id}`} label="Titre" defaultValue={it.titre} required />
                    <Text name="ordre" id={`ordre-${it.id}`} label="Ordre" type="number" min={0} defaultValue={it.ordre} />
                  </div>
                </AdminForm>
                {user.perms.GALERIE.supprimer && (
                  <form action={deleteGalleryItem.bind(null, it.id)} className="mt-3">
                    <ConfirmButton message="Retirer cet élément de la galerie ?" className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer</ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
