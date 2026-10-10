"use client";

import { useEffect } from "react";

// Ouvre la boîte d'impression (→ « Enregistrer au format PDF ») une fois les photos chargées
export function AutoPrint() {
  useEffect(() => {
    const imgs = [...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }));
    Promise.all(imgs).then(() => setTimeout(() => window.print(), 300));
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="fixed right-4 bottom-4 rounded-full bg-navy px-6 py-3 font-semibold text-white shadow-xl print:hidden">
      Imprimer / PDF
    </button>
  );
}
