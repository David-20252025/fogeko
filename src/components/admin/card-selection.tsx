"use client";

import { useEffect, useState } from "react";

// form.elements inclut les champs associés via l'attribut form, contrairement à querySelectorAll
const boxes = (formId: string) =>
  [...((document.getElementById(formId) as HTMLFormElement | null)?.elements ?? [])].filter(
    (e): e is HTMLInputElement => e instanceof HTMLInputElement && e.name === "id",
  );

// Barre d'actions de la sélection : compte les cases cochées du formulaire et envoie vers l'impression des cartes
export function CardSelection({ formId }: { formId: string }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Les cases sont rattachées au formulaire par l'attribut form="…" (hors de son arbre DOM) : on écoute le document
    const update = () => { const b = boxes(formId); setCount(b.filter((x) => x.checked).length); setTotal(b.length); };
    update();
    document.addEventListener("change", update);
    return () => document.removeEventListener("change", update);
  }, [formId]);

  const toggleAll = (checked: boolean) => {
    boxes(formId).forEach((b) => (b.checked = checked));
    document.dispatchEvent(new Event("change"));
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-white px-5 py-3">
      <label className="flex items-center gap-2 font-semibold text-navy">
        <input type="checkbox" className="size-5 accent-navy" checked={total > 0 && count === total} onChange={(e) => toggleAll(e.target.checked)} />
        Tout sélectionner (cette page)
      </label>
      <span className="text-ink/70">{count} sélectionné{count > 1 ? "s" : ""}</span>
      <div className="ml-auto flex flex-wrap gap-2">
        <button form={formId} name="format" value="a4" disabled={!count} className="rounded-full border-2 border-navy px-4 py-2 font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-40">
          Cartes · planche A4
        </button>
        <button form={formId} name="format" value="cr80" disabled={!count} className="rounded-full bg-navy px-4 py-2 font-semibold text-white hover:bg-navy-700 disabled:opacity-40">
          Cartes · format CR80
        </button>
      </div>
    </div>
  );
}
