"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Close } from "./icons";

export type GalleryEntry = { id: number; titre: string; type: "PHOTO" | "VIDEO"; src?: string; embed?: string; thumb?: string };

export function GalleryGrid({ items }: { items: GalleryEntry[] }) {
  const [filter, setFilter] = useState<"ALL" | "PHOTO" | "VIDEO">("ALL");
  const [current, setCurrent] = useState<GalleryEntry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shown = items.filter((i) => filter === "ALL" || i.type === filter);
  const hasVideos = items.some((i) => i.type === "VIDEO");

  useEffect(() => {
    if (current) dialog.current?.showModal();
  }, [current]);

  // Flèches clavier pour passer d'une photo à l'autre
  const step = (d: number) => {
    if (!current) return;
    const i = shown.findIndex((x) => x.id === current.id);
    setCurrent(shown[(i + d + shown.length) % shown.length]);
  };

  return (
    <>
      {hasVideos && (
        <div className="flex gap-2" role="group" aria-label="Filtrer">
          {([["ALL", "Tout"], ["PHOTO", "Photos"], ["VIDEO", "Vidéos"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`rounded-full px-5 py-2.5 font-semibold transition ${filter === k ? "bg-navy text-white" : "bg-mist text-navy hover:bg-navy/10"}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
        {shown.map((it) => (
          <li key={it.id}>
            <button type="button" onClick={() => setCurrent(it)} className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-navy text-left md:rounded-3xl">
              {it.type === "PHOTO" && it.src ? (
                <Image src={it.src} alt={it.titre} fill loading="lazy" sizes="(min-width: 768px) 33vw, 50vw" className="object-cover object-[50%_25%] transition duration-500 group-hover:scale-105" />
              ) : it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniature YouTube distante, déjà optimisée
                <img src={it.thumb} alt={it.titre} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="size-full bg-gradient-to-br from-navy to-navy-700" />
              )}
              {it.type === "VIDEO" && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-14 place-items-center rounded-full bg-rouge text-white shadow-xl">
                    <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden><path d="M7 4v16l13-8z" /></svg>
                  </span>
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 to-transparent p-3 pt-10 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 max-md:opacity-100">
                {it.titre}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setCurrent(null)}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}
        className="m-auto w-[min(1100px,94vw)] max-w-none bg-transparent p-0 backdrop:bg-navy-900/90"
        aria-label={current?.titre}
      >
        {current && (
          <figure>
            {current.type === "PHOTO" && current.src ? (
              <Image src={current.src} alt={current.titre} width={1600} height={1600} sizes="94vw" className="mx-auto max-h-[80vh] w-auto rounded-2xl object-contain" />
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
                <iframe src={current.embed} title={current.titre} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="size-full" />
              </div>
            )}
            <figcaption className="mt-4 flex items-center justify-between gap-4 text-white">
              <span className="font-semibold">{current.titre}</span>
              <span className="flex gap-2">
                {shown.length > 1 && (
                  <>
                    <button type="button" onClick={() => step(-1)} className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Précédent">←</button>
                    <button type="button" onClick={() => step(1)} className="grid size-11 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label="Suivant">→</button>
                  </>
                )}
                <button type="button" onClick={() => dialog.current?.close()} className="grid size-11 place-items-center rounded-full bg-rouge" aria-label="Fermer"><Close className="size-5" /></button>
              </span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
