"use client";

import { useActionState, useState } from "react";
import { keepOnSubmit } from "@/lib/use-keep-form";
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
  return (
    <form onSubmit={keepOnSubmit(action)} className="grid gap-4 sm:grid-cols-2">
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
