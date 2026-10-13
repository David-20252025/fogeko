"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { importerArchive } from "@/app/gestion/(app)/archives/actions";
import { ARCHIVE_MAX, CATEGORIES_ARCHIVE } from "@/lib/archive-file";
import { admInput, admLabel } from "./fields";

type Item = { file: File; titre: string; etat: "attente" | "envoi" | "ok" | "erreur"; message?: string };
const ACCEPT = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Import multiple par glisser-déposer : les fichiers partent un par un (chacun ≤ 10 Mo), avec un état par fichier. */
export function ArchiveUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const [survol, setSurvol] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const ajouter = (files: FileList | null) => {
    if (!files) return;
    setItems((prev) => [
      ...prev,
      ...[...files].map((file): Item => {
        const titre = file.name.replace(/\.[^.]+$/, "");
        if (file.size > ARCHIVE_MAX) return { file, titre, etat: "erreur", message: "Plus de 10 Mo" };
        if (!ACCEPT.includes(file.type)) return { file, titre, etat: "erreur", message: "Ni PDF ni image" };
        return { file, titre, etat: "attente" };
      }),
    ]);
  };

  const envoyer = async () => {
    const commun = new FormData(form.current!);
    setBusy(true);
    for (let i = 0; i < items.length; i++) {
      if (items[i].etat !== "attente") continue;
      setItems((l) => l.map((x, j) => (j === i ? { ...x, etat: "envoi" } : x)));
      const fd = new FormData();
      for (const [k, v] of commun) fd.set(k, v);
      fd.set("titre", items[i].titre);
      fd.set("fichier", items[i].file);
      // Le serveur revérifie tout (vrai type du fichier, taille, droits) : les contrôles ci-dessus ne servent qu'au confort
      const r = await importerArchive({}, fd).catch(() => ({ error: "Échec de l'envoi" }));
      setItems((l) => l.map((x, j) => (j === i ? { ...x, etat: r.error ? "erreur" : "ok", message: r.error } : x)));
    }
    setBusy(false);
    router.refresh();
  };

  const enAttente = items.filter((x) => x.etat === "attente").length;
  return (
    <form ref={form} onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="grid gap-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${survol ? "border-navy bg-navy/5" : "border-navy/25 bg-mist hover:border-navy"}`}
      >
        <span className="font-semibold text-navy">Glissez-déposez vos documents ici ou cliquez pour choisir</span>
        <span className="text-sm text-ink/70">PDF, JPG, PNG ou WEBP · 10 Mo maximum par fichier · plusieurs fichiers possibles</span>
        <input type="file" multiple accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} />
      </label>

      {items.length > 0 && (
        <ul className="divide-y divide-navy/5 rounded-2xl ring-1 ring-navy/10">
          {items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <input value={it.titre} disabled={it.etat !== "attente"} aria-label={`Titre de ${it.file.name}`}
                onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, titre: e.target.value } : x)))}
                className="min-w-48 flex-1 rounded-lg border-2 border-navy/10 px-2.5 py-1.5" />
              <span className="text-ink/65">{(it.file.size / 1024 / 1024).toFixed(1)} Mo</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${it.etat === "ok" ? "bg-emerald-50 text-emerald-700" : it.etat === "erreur" ? "bg-rouge/10 text-rouge-600" : "bg-mist"}`}>
                {{ attente: "À envoyer", envoi: "Envoi…", ok: "Importé", erreur: it.message ?? "Erreur" }[it.etat]}
              </span>
              {it.etat === "attente" && <button type="button" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="text-ink/60 hover:text-rouge-600" aria-label="Retirer">✕</button>}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="categorie" className={admLabel}>Catégorie</label>
          <select id="categorie" name="categorie" className={admInput}>{Object.entries(CATEGORIES_ARCHIVE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div><label htmlFor="dateDocument" className={admLabel}>Date du document</label><input id="dateDocument" name="dateDocument" type="date" className={admInput} /></div>
        <div><label htmlFor="motsCles" className={admLabel}>Mots-clés (séparés par des virgules)</label><input id="motsCles" name="motsCles" placeholder="statuts, assemblée, 2026" className={admInput} /></div>
      </div>
      <div><label htmlFor="description" className={admLabel}>Description (commune aux fichiers)</label><textarea id="description" name="description" rows={2} className={admInput} /></div>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy || enAttente === 0} className="rounded-full bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-700 disabled:opacity-50">
          {busy ? "Import en cours…" : `Importer ${enAttente || ""} document${enAttente > 1 ? "s" : ""}`}
        </button>
        {items.some((x) => x.etat === "ok") && !busy && <button type="button" onClick={() => setItems((l) => l.filter((x) => x.etat !== "ok"))} className="text-sm font-semibold text-navy underline">Vider la liste des fichiers importés</button>}
      </div>
    </form>
  );
}
