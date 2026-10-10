"use client";

import { useEffect, useRef, useState } from "react";

/** Aperçu de la 1re page d'un PDF (pdf.js), rendu seulement quand la vignette devient visible. */
export function PdfThumb({ src, titre }: { src: string; titre: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [etat, setEtat] = useState<"attente" | "ok" | "erreur">("attente");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let annule = false;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const tache = pdfjs.getDocument({ url: src });
        const doc = await tache.promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (el.clientWidth * (window.devicePixelRatio || 1)) / base.width });
        const c = canvas.current;
        if (annule || !c) return;
        c.width = viewport.width; c.height = viewport.height;
        await page.render({ canvas: c, viewport }).promise;
        if (!annule) setEtat("ok");
        await tache.destroy();
      } catch {
        if (!annule) setEtat("erreur");
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => { annule = true; io.disconnect(); };
  }, [src]);

  return (
    <div ref={box} className="relative size-full bg-white">
      <canvas ref={canvas} role="img" aria-label={`Première page de ${titre}`} className={`size-full object-contain object-top ${etat === "ok" ? "" : "hidden"}`} />
      {etat !== "ok" && (
        <div className="grid size-full place-items-center text-sm font-semibold text-ink/60">{etat === "erreur" ? "Aperçu indisponible" : "PDF…"}</div>
      )}
    </div>
  );
}
