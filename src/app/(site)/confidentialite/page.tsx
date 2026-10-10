import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Comment la Fondation Gekoko protège les données personnelles de ses membres.",
};

export default async function PrivacyPage() {
  const s = await getSettings();
  const sections = [
    ["Quelles données collectons-nous ?", "Lors de l'adhésion : nom, post-nom, prénom, sexe, date de naissance, téléphone, email (facultatif), commune, quartier, profession, catégorie de membre, église ou ministère pour les pasteurs, et une photo de profil. Via le formulaire de contact : votre nom, vos coordonnées et votre message."],
    ["Pourquoi ?", "Uniquement pour gérer les adhésions, établir la carte de membre, vous contacter au sujet des activités de la fondation et produire des statistiques internes (nombre de membres par commune ou par catégorie)."],
    ["Qui y a accès ?", "Seules les personnes habilitées par la fondation (administrateurs et secrétaires), après connexion sécurisée. Les fiches et photos des membres ne sont jamais publiées sur le site public. Vos données ne sont ni vendues ni cédées."],
    ["Combien de temps ?", "Tant que vous êtes membre de la fondation. Si vous quittez la fondation, vos données sont supprimées sur simple demande."],
    ["Vos droits", `Vous pouvez à tout moment demander à consulter, corriger ou supprimer vos données en écrivant à ${s.email} ou en nous contactant au ${s.telephone}.`],
    ["Cookies", "Le site n'utilise pas de cookies publicitaires ni de suivi. Un cookie technique est utilisé uniquement pour la connexion de l'équipe à l'espace de gestion. Les vidéos YouTube et Facebook ne sont chargées que si vous cliquez dessus."],
  ];

  return (
    <>
      <PageHero kicker="Vos données" title="Politique de confidentialité" />
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
        {sections.map(([t, d]) => (
          <section key={t} className="mt-10">
            <h2 className="text-2xl font-bold text-navy">{t}</h2>
            <p className="mt-3 text-lg leading-relaxed text-ink/85">{d}</p>
          </section>
        ))}
      </div>
    </>
  );
}
