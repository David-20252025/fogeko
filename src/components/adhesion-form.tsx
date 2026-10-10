"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { createMember, type AdhesionState } from "@/app/(site)/adhesion/actions";
import { CATEGORIES, type CategorieKey } from "@/lib/members";
import { inputCls, labelCls } from "./contact-form";
import { ArrowUpRight } from "./icons";

const STEPS = ["Identité", "Localisation", "Catégorie", "Photo"];
const CAT_TEXT: Record<CategorieKey, string> = {
  MAMAN: "Mamans engagées pour leurs familles et leurs quartiers",
  PAPA: "Papas au service de la communauté",
  JEUNE: "Jeunes qui veulent agir pour Kinshasa",
  PASTEUR: "Pasteurs qui soutiennent la fondation",
};

// Recadrage carré 800×800 en JPEG, fait dans le navigateur : envoi léger même en réseau lent
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = 800;
  c.getContext("2d")!.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 800, 800);
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error("canvas"))), "image/jpeg", 0.85));
}

export function AdhesionForm({ communes, initialCategorie }: { communes: { id: number; nom: string }[]; initialCategorie?: CategorieKey }) {
  const [state, action, pending] = useActionState<AdhesionState, FormData>(createMember, {});
  const [step, setStep] = useState(0);
  const [categorie, setCategorie] = useState<CategorieKey | undefined>(initialCategorie);
  const [src, setSrc] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>();
  const [preview, setPreview] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const form = useRef<HTMLFormElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const go = (n: number) => {
    setStep(n);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Valide uniquement les champs de l'étape affichée avant d'avancer
  const stepValid = () => {
    const fields = form.current!.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] :is(input,select,textarea)`);
    for (const f of fields) if (!f.checkValidity()) return f.reportValidity();
    return true;
  };
  const next = () => stepValid() && go(step + 1);

  const onFile = (file?: File) => {
    setPhotoError(undefined);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Choisissez une photo (JPG, PNG…).");
    if (file.size > 15 * 1024 * 1024) return setPhotoError("Photo trop lourde (15 Mo maximum).");
    setSrc(URL.createObjectURL(file));
    setZoom(1);
    setPreview(undefined);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < STEPS.length - 1) return next(); // touche Entrée sur une étape intermédiaire
    if (!stepValid()) return;
    if (!src || !area) return setPhotoError("La photo de profil est obligatoire.");
    const fd = new FormData(e.currentTarget);
    fd.delete("fichier");
    fd.set("photo", await cropToBlob(src, area), "photo.jpg");
    startTransition(() => action(fd));
  };

  if (state.ok)
    return (
      <div className="rounded-[2rem] bg-navy p-8 text-center text-white md:p-14" role="status">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
          <img src={preview} alt="" className="mx-auto size-28 rounded-full object-cover ring-4 ring-ocre" />
        )}
        <p className="font-slab mt-6 text-4xl font-bold">Bienvenue{state.prenom ? `, ${state.prenom}` : ""} !</p>
        <p className="mt-4 text-lg text-white/85">Votre demande d&apos;adhésion a bien été enregistrée.</p>
        <p className="mt-6 inline-block rounded-2xl bg-white/10 px-6 py-4">
          Votre numéro de membre : <strong className="font-slab block text-3xl text-ocre">{state.numero}</strong>
        </p>
        <p className="mx-auto mt-6 max-w-md text-white/75">Notez-le bien. L&apos;équipe de la fondation validera votre adhésion et vous contactera par téléphone.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-rouge-600 px-7 py-4 font-semibold hover:bg-rouge-700">Retour à l&apos;accueil <ArrowUpRight /></Link>
      </div>
    );

  return (
    <div ref={top} className="scroll-mt-28">
      {/* Progression */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}>
            <span className={`block h-2 rounded-full transition ${i <= step ? "bg-rouge" : "bg-navy/10"}`} />
            <span className={`mt-2 block text-xs font-semibold sm:text-sm ${i === step ? "text-navy" : "text-ink/65"}`}>
              <span className="hidden sm:inline">{i + 1}. </span>{s}
            </span>
          </li>
        ))}
      </ol>

      <form ref={form} onSubmit={onSubmit} noValidate className="mt-8 rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-navy/5 md:p-10">
        <fieldset data-step="0" hidden={step !== 0} className="grid gap-5 sm:grid-cols-2">
          <legend className="font-slab mb-6 text-3xl font-bold text-navy">Qui êtes-vous ?</legend>
          <Field id="nom" label="Nom" required autoComplete="family-name" />
          <Field id="postNom" label="Post-nom" optional />
          <Field id="prenom" label="Prénom" required autoComplete="given-name" />
          <div>
            <span className={labelCls}>Sexe</span>
            <div className="grid grid-cols-2 gap-3">
              {[["F", "Femme"], ["M", "Homme"]].map(([v, l]) => (
                <label key={v} className="cursor-pointer rounded-xl border-2 border-navy/10 px-4 py-3.5 text-center font-semibold text-navy has-checked:border-navy has-checked:bg-navy has-checked:text-white">
                  <input type="radio" name="sexe" value={v} required className="sr-only" /> {l}
                </label>
              ))}
            </div>
          </div>
          <Field id="dateNaissance" label="Date de naissance" type="date" optional />
          <Field id="telephone" label="Téléphone" type="tel" required autoComplete="tel" placeholder="0812345678" minLength={9} />
          <div className="sm:col-span-2"><Field id="email" label="Email" type="email" optional autoComplete="email" /></div>
        </fieldset>

        <fieldset data-step="1" hidden={step !== 1} className="grid gap-5 sm:grid-cols-2">
          <legend className="font-slab mb-6 text-3xl font-bold text-navy">Où habitez-vous ?</legend>
          <div>
            <label htmlFor="communeId" className={labelCls}>Commune</label>
            <select id="communeId" name="communeId" required defaultValue="" className={inputCls}>
              <option value="" disabled>Choisir…</option>
              {communes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <Field id="quartier" label="Quartier" required />
          <div className="sm:col-span-2"><Field id="profession" label="Profession" optional /></div>
        </fieldset>

        <fieldset data-step="2" hidden={step !== 2}>
          <legend className="font-slab mb-6 text-3xl font-bold text-navy">Vous rejoignez en tant que…</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(CATEGORIES) as CategorieKey[]).map((k) => (
              <label key={k} className="group cursor-pointer rounded-2xl border-2 border-navy/10 p-5 transition hover:border-navy/40 has-checked:border-navy has-checked:bg-navy">
                <input type="radio" name="categorie" value={k} required checked={categorie === k} onChange={() => setCategorie(k)} className="sr-only" />
                <span className="font-slab block text-2xl font-bold text-navy group-has-checked:text-white">{CATEGORIES[k]}</span>
                <span className="mt-1 block text-ink/70 group-has-checked:text-white/80">{CAT_TEXT[k]}</span>
              </label>
            ))}
          </div>
          {categorie === "PASTEUR" && (
            <div className="mt-5"><Field id="egliseMinistere" label="Église / ministère" required /></div>
          )}
        </fieldset>

        <fieldset data-step="3" hidden={step !== 3}>
          <legend className="font-slab mb-2 text-3xl font-bold text-navy">Votre photo</legend>
          <p className="mb-6 text-ink/70">Une photo de face, bien éclairée. Elle figurera sur votre carte de membre.</p>
          <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
            <div>
              {src ? (
                <>
                  <div className="relative h-72 overflow-hidden rounded-2xl bg-navy md:h-80">
                    <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                      onCropChange={setCrop} onZoomChange={setZoom}
                      onCropComplete={(_, px) => { setArea(px); cropToBlob(src, px).then((b) => setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); })); }} />
                  </div>
                  <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-navy">
                    Zoom
                    <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-rouge" />
                  </label>
                </>
              ) : (
                <label className="flex h-72 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-navy/25 bg-mist text-center text-navy transition hover:border-navy md:h-80">
                  <span className="grid size-16 place-items-center rounded-full bg-navy text-white">
                    <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                  </span>
                  <span className="font-semibold">Prendre ou choisir une photo</span>
                  <span className="text-sm text-ink/70">JPG ou PNG</span>
                  <input type="file" name="fichier" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              )}
              {src && (
                <label className="mt-3 inline-block cursor-pointer py-1 text-sm font-semibold text-rouge-600 underline">
                  Changer de photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              )}
              {photoError && <p className="mt-3 font-medium text-rouge-600" role="alert">{photoError}</p>}
            </div>
            <div className="text-center">
              <p className="mb-3 text-sm font-semibold text-ink/70">Aperçu</p>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob)
                <img src={preview} alt="Aperçu de votre photo de profil" className="mx-auto size-36 rounded-full object-cover ring-4 ring-ocre" />
              ) : (
                <div className="mx-auto size-36 rounded-full bg-mist ring-4 ring-navy/10" />
              )}
            </div>
          </div>

          <label className="mt-8 flex gap-3 rounded-2xl bg-mist p-4 text-[15px]">
            <input type="checkbox" name="consentement" required className="mt-1 size-5 shrink-0 accent-navy" />
            <span>
              J&apos;accepte que la Fondation Gekoko enregistre mes informations et ma photo pour gérer mon adhésion.
              Elles ne seront jamais publiées ni cédées. <Link href="/confidentialite" target="_blank" className="font-semibold text-navy underline">En savoir plus</Link>
            </span>
          </label>
        </fieldset>

        <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        {state.error && <p className="mt-6 rounded-xl bg-rouge/10 px-4 py-3 font-medium text-rouge-600" role="alert">{state.error}</p>}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className="rounded-full border-2 border-navy/15 px-6 py-3.5 font-semibold text-navy hover:border-navy">← Retour</button>
          ) : <span />}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="rounded-full bg-navy px-8 py-4 text-lg font-semibold text-white hover:bg-navy-700">Continuer →</button>
          ) : (
            <button type="submit" disabled={pending} className="rounded-full bg-rouge-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-rouge/25 hover:bg-rouge-700 disabled:opacity-60">
              {pending ? "Envoi en cours…" : "Valider mon adhésion"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ id, label, optional, ...rest }: { id: string; label: string; optional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label} {optional && <span className="font-normal text-ink/65">(facultatif)</span>}
      </label>
      <input id={id} name={id} className={inputCls} {...rest} />
    </div>
  );
}
