import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Area, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { deleteTimeline, saveSettings, saveTimeline } from "../content-actions";

const box = "rounded-3xl bg-white p-6";
const h2 = "mb-4 text-xl font-bold text-navy";

export default async function SiteAdmin() {
  const user = await requirePerm("TEXTES");
  const [s, timeline] = await Promise.all([getSettings(), db.timelineEvent.findMany({ orderBy: { ordre: "asc" } })]);

  return (
    <div className="space-y-4">
      <PageHead title="Textes du site" sub="Tout ce qui s'affiche sur le site public, modifiable sans toucher au code." />

      <AdminForm action={saveSettings} submit="Enregistrer les textes" className="grid gap-4" readOnly={!user.perms.TEXTES.modifier}>
        <section className={box}>
          <h2 className={h2}>Accueil</h2>
          <div className="grid gap-4">
            <Text name="heroTitre" label="Grand titre" defaultValue={s.heroTitre} required hint="Le dernier mot est souligné en rouge." />
            <Area name="heroSousTitre" label="Sous-titre" defaultValue={s.heroSousTitre} rows={2} required />
            <div className="grid gap-4 sm:grid-cols-3">
              <Text name="statMembres" label="Chiffre : membres" type="number" min={0} defaultValue={s.statMembres} hint="0 = chiffre masqué sur le site" />
              <Text name="statCommunes" label="Chiffre : communes" type="number" min={0} defaultValue={s.statCommunes} />
              <Text name="statActions" label="Chiffre : actions" type="number" min={0} defaultValue={s.statActions} />
            </div>
          </div>
        </section>
        <section className={box}>
          <h2 className={h2}>À propos</h2>
          <div className="grid gap-4">
            <Area name="mission" label="Mission" defaultValue={s.mission} rows={3} required />
            <Area name="vision" label="Vision" defaultValue={s.vision} rows={3} required />
            <Text name="valeurs" label="Valeurs" defaultValue={s.valeurs} required hint="Séparées par « · » (ex. Paix · Solidarité · Proximité)." />
            <Area name="fondateurBio" label="Parcours du fondateur" defaultValue={s.fondateurBio} rows={6} required />
          </div>
        </section>
        <section className={box}>
          <h2 className={h2}>Coordonnées et réseaux</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="whatsapp" label="WhatsApp (format international)" defaultValue={s.whatsapp} required placeholder="243812345678" />
            <Text name="telephone" label="Téléphone(s) affiché(s)" defaultValue={s.telephone} required hint="Plusieurs numéros : séparez-les par « / »." />
            <Text name="email" label="Email" type="email" defaultValue={s.email} required />
            <Text name="adresse" label="Adresse" defaultValue={s.adresse} required />
            <Text name="facebook" label="Page Facebook" defaultValue={s.facebook ?? ""} placeholder="https://facebook.com/…" />
            <Text name="youtube" label="Chaîne YouTube" defaultValue={s.youtube ?? ""} placeholder="https://youtube.com/…" />
            <Text name="tiktok" label="TikTok" defaultValue={s.tiktok ?? ""} placeholder="https://tiktok.com/@…" />
            <Text name="instagram" label="Instagram" defaultValue={s.instagram ?? ""} placeholder="https://instagram.com/…" />
          </div>
        </section>
      </AdminForm>

      <section className={box}>
        <h2 className={h2}>Frise chronologique (page À propos)</h2>
        <ul className="space-y-4">
          {timeline.map((e) => (
            <li key={e.id} className="rounded-2xl bg-mist p-4">
              <AdminForm action={saveTimeline.bind(null, e.id)} readOnly={!user.perms.TEXTES.modifier}>
                <div className="grid gap-3 sm:grid-cols-[8rem_1fr_5rem]">
                  <Text name="annee" id={`annee-${e.id}`} label="Année / date" defaultValue={e.annee} />
                  <Text name="titre" id={`titre-${e.id}`} label="Titre" defaultValue={e.titre} required />
                  <Text name="ordre" id={`ordre-${e.id}`} label="Ordre" type="number" min={0} defaultValue={e.ordre} />
                </div>
                <Area name="texte" id={`texte-${e.id}`} label="Texte" defaultValue={e.texte} rows={2} />
              </AdminForm>
              {user.perms.TEXTES.supprimer && (
                <form action={deleteTimeline.bind(null, e.id)} className="mt-2">
                  <ConfirmButton message="Supprimer cette étape ?" className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer</ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        {user.perms.TEXTES.creer && <div className="mt-6 border-t border-navy/5 pt-6">
          <p className="mb-3 font-semibold text-navy">Ajouter une étape</p>
          <AdminForm resetOnSuccess action={saveTimeline.bind(null, null)} submit="Ajouter">
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr_5rem]">
              <Text name="annee" label="Année / date" />
              <Text name="titre" label="Titre" required />
              <Text name="ordre" label="Ordre" type="number" min={0} defaultValue={timeline.length} />
            </div>
            <Area name="texte" label="Texte" rows={2} />
          </AdminForm>
        </div>}
      </section>
    </div>
  );
}
