"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropToBlob } from "@/components/adhesion-form";
import { admInput, admLabel } from "./fields";

/**
 * Choix d'une photo avec recadrage rond et zoom. La photo recadrée (800×800 JPEG) est placée dans un champ
 * fichier caché `name` : le formulaire l'envoie comme un fichier normal, sans code d'envoi particulier.
 * Pour refermer le recadrage après un enregistrement, le parent change la `key` (ex. chemin de la photo).
 */
export function PhotoCrop({ name, label, required = false, current }: { name: string; label: string; required?: boolean; current?: string | null }) {
  const [src, setSrc] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [erreur, setErreur] = useState<string>();
  const fichier = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    setErreur(undefined);
    setSrc(undefined);
    fichier.current!.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Décodage dans le navigateur : un fichier qui n'est pas une image est refusé avant l'envoi
    const ok = await Object.assign(new Image(), { src: url }).decode().then(() => true, () => false);
    if (!ok) return setErreur("Ce fichier n'est pas une photo lisible (JPG, PNG ou WebP).");
    setSrc(url); setZoom(1); setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = (_: Area, px: Area) => {
    cropToBlob(src!, px).then((b) => {
      const dt = new DataTransfer();
      dt.items.add(new File([b], "photo.jpg", { type: "image/jpeg" }));
      if (fichier.current) fichier.current.files = dt.files;
    });
  };

  return (
    <div>
      <label htmlFor={`${name}-choix`} className={admLabel}>{label}</label>
      <div className="flex items-center gap-4">
        {current && !src && (
          // eslint-disable-next-line @next/next/no-img-element -- photo protégée
          <img src={current} alt="Photo actuelle" className="size-16 shrink-0 rounded-full object-cover ring-2 ring-ocre" />
        )}
        <input id={`${name}-choix`} type="file" accept="image/*" required={required} onChange={(e) => onFile(e.target.files?.[0])} className={admInput} />
      </div>
      <input ref={fichier} type="file" name={name} hidden />
      {erreur && <p className="mt-2 font-semibold text-rouge-600" role="alert">{erreur}</p>}
      {src && (
        <div className="mt-3">
          <div className="relative h-72 overflow-hidden rounded-2xl bg-navy">
            <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
          </div>
          <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-navy">
            Zoom
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-rouge" />
          </label>
          <p className="mt-1 text-sm text-ink/65">Déplacez la photo et ajustez le zoom, puis enregistrez.</p>
        </div>
      )}
    </div>
  );
}
