import type { Metadata } from "next";
import { GalleryGrid, type GalleryEntry } from "@/components/gallery-grid";
import { PageHero } from "@/components/page-hero";
import { db } from "@/lib/db";
import { videoEmbed } from "@/lib/video";

export const metadata: Metadata = {
  title: "Galerie",
  description: "Photos et vidéos des activités de la Fondation Gekoko à Kinshasa.",
};

export default async function GalleryPage() {
  const rows = await db.galleryItem.findMany({ orderBy: [{ ordre: "asc" }, { date: "desc" }] });
  const items = rows.flatMap<GalleryEntry>((r) => {
    if (r.type === "PHOTO") return r.image ? [{ id: r.id, titre: r.titre, type: "PHOTO" as const, src: r.image }] : [];
    const v = r.videoUrl ? videoEmbed(r.videoUrl) : null;
    return v ? [{ id: r.id, titre: r.titre, type: "VIDEO" as const, ...v }] : [];
  });

  return (
    <>
      <PageHero kicker="Galerie" title="En images" intro="Les moments forts de la fondation, en photos et en vidéos." image="/img/fondateur-peau.webp" />
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
        {items.length ? <GalleryGrid items={items} /> : <p className="rounded-3xl bg-mist p-10 text-center text-lg">La galerie sera bientôt alimentée.</p>}
      </div>
    </>
  );
}
