import type { Metadata } from "next";
import { AdhesionForm } from "@/components/adhesion-form";
import { PageHero } from "@/components/page-hero";
import { db } from "@/lib/db";
import { CATEGORIES, type CategorieKey } from "@/lib/members";

export const metadata: Metadata = {
  title: "Adhésion en ligne",
  description: "Rejoignez la Fondation Gekoko : mamans, papas, jeunes et pasteurs, inscrivez-vous en ligne en quelques minutes.",
};

export default async function AdhesionPage(props: PageProps<"/adhesion">) {
  const { categorie } = await props.searchParams;
  const communes = await db.commune.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
  const initial = typeof categorie === "string" && categorie in CATEGORIES ? (categorie as CategorieKey) : undefined;

  return (
    <>
      <PageHero kicker="Adhésion en ligne" title="Rejoindre la fondation" intro="Quatre étapes simples, quelques minutes. Votre numéro de membre vous est donné immédiatement." image="/img/fondateur-hommage.webp" />
      <div className="bg-mist">
        <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
          <AdhesionForm communes={communes} initialCategorie={initial} />
        </div>
      </div>
    </>
  );
}
