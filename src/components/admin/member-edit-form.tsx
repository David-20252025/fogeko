"use client";

import { startTransition, useActionState, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropToBlob } from "@/components/adhesion-form";
import { updateMember, type FormState } from "@/app/gestion/(app)/membres/actions";
import { CATEGORIES, STATUTS, type CategorieKey } from "@/lib/members";

import { admInput, admLabel } from "./fields";

type M = {
  id: string; nom: string; postNom: string | null; prenom: string; sexe: string; dateNaissance: string; telephone: string;
  email: string | null; communeId: number; quartier: string; profession: string | null; categorie: CategorieKey;
  egliseMinistere: string | null; statut: string;
};

export function MemberEditForm({ m, communes, readOnly }: { m: M; communes: { id: number; nom: string }[]; readOnly: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateMember.bind(null, m.id), {});
  const [cat, setCat] = useState(m.categorie);
  const [src, setSrc] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>();
  const [photoError, setPhotoError] = useState<string>();
  const [choisiPour, setChoisiPour] = useState(state);
  // Photo enregistrée (succès après le choix) : le recadrage se referme, la fiche affiche la nouvelle photo
  const photo = src && !(state.ok && state !== choisiPour) ? src : undefined;

  const onFile = async (file?: File) => {
    setPhotoError(undefined);
    setSrc(undefined);
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Décodage dans le navigateur : un fichier qui n'est pas une image est refusé avant l'envoi
    const ok = await Object.assign(new Image(), { src: url }).decode().then(() => true, () => false);
    if (!ok) return setPhotoError("Ce fichier n'est pas une photo lisible (JPG, PNG ou WebP).");
    setSrc(url); setChoisiPour(state); setZoom(1); setCrop({ x: 0, y: 0 });
  };

  // Comme keepOnSubmit (saisie conservée en cas d'erreur), avec la photo recadrée en 800×800
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (photo && area) fd.set("photo", await cropToBlob(photo, area), "photo.jpg");
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <F ro={readOnly} name="nom" label="Nom" value={m.nom} required />
      <F ro={readOnly} name="postNom" label="Post-nom" value={m.postNom} />
      <F ro={readOnly} name="prenom" label="Prénom" value={m.prenom} required />
      <div>
        <label htmlFor="sexe" className={admLabel}>Sexe</label>
        <select id="sexe" name="sexe" defaultValue={m.sexe} disabled={readOnly} className={admInput}>
          <option value="F">Femme</option><option value="M">Homme</option>
        </select>
      </div>
      <F ro={readOnly} name="dateNaissance" label="Date de naissance" type="date" value={m.dateNaissance} />
      <F ro={readOnly} name="telephone" label="Téléphone" type="tel" value={m.telephone} required />
      <F ro={readOnly} name="email" label="Email" type="email" value={m.email} />
      <F ro={readOnly} name="profession" label="Profession" value={m.profession} />
      <div>
        <label htmlFor="communeId" className={admLabel}>Commune</label>
        <select id="communeId" name="communeId" defaultValue={m.communeId} disabled={readOnly} className={admInput}>
          {communes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>
      <F ro={readOnly} name="quartier" label="Quartier" value={m.quartier} required />
      <div>
        <label htmlFor="categorie" className={admLabel}>Catégorie</label>
        <select id="categorie" name="categorie" value={cat} onChange={(e) => setCat(e.target.value as CategorieKey)} disabled={readOnly} className={admInput}>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="statut" className={admLabel}>Statut</label>
        <select id="statut" name="statut" defaultValue={m.statut} disabled={readOnly} className={admInput}>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {cat === "PASTEUR" && <div className="sm:col-span-2"><F ro={readOnly} name="egliseMinistere" label="Église / ministère" value={m.egliseMinistere} required /></div>}
      {!readOnly && (
        <div className="sm:col-span-2">
          <label htmlFor="photo" className={admLabel}>Nouvelle photo (facultatif : remplace la photo actuelle)</label>
          <input id="photo" type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} className={admInput} />
          {photoError && <p className="mt-2 font-semibold text-rouge-600" role="alert">{photoError}</p>}
          {photo && (
            <div className="mt-3">
              <div className="relative h-72 overflow-hidden rounded-2xl bg-navy">
                <Cropper image={photo} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                  onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
              </div>
              <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-navy">
                Zoom
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-rouge" />
              </label>
              <p className="mt-1 text-sm text-ink/65">Déplacez la photo et ajustez le zoom, puis enregistrez.</p>
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <button disabled={pending} className="rounded-full bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
            {pending ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
          {state.ok && !pending && <p className="font-semibold text-emerald-700" role="status">Modifications enregistrées.</p>}
          {state.error && <p className="font-semibold text-rouge-600" role="alert">{state.error}</p>}
        </div>
      )}
    </form>
  );
}

function F({ name, label, value, type = "text", required, ro }: { name: string; label: string; value?: string | null; type?: string; required?: boolean; ro: boolean }) {
  return (
    <div>
      <label htmlFor={name} className={admLabel}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={value ?? ""} required={required} disabled={ro} className={admInput} />
    </div>
  );
}
