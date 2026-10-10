import { annuler } from "@/app/gestion/(app)/finances/actions";
import { AdminForm } from "./admin-form";

/** Annulation d'une écriture financière : motif obligatoire, l'écriture reste visible (jamais supprimée). */
export function Annuler({ type, id }: { type: "don" | "depense" | "paiement"; id: number }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-rouge-600 hover:underline">Annuler</summary>
      <div className="mt-2 w-64 rounded-xl bg-mist p-3">
        <AdminForm action={annuler.bind(null, type, id)} submit="Confirmer l'annulation" className="grid gap-2">
          <label htmlFor={`motif-${type}-${id}`} className="text-xs font-semibold text-ink/70">Motif (obligatoire)</label>
          <textarea id={`motif-${type}-${id}`} name="motif" required minLength={5} rows={2} className="rounded-lg border-2 border-navy/10 p-2" />
        </AdminForm>
      </div>
    </details>
  );
}

export function Annulee({ le, motif }: { le: Date; motif: string | null }) {
  return <span className="text-xs font-semibold text-rouge-600" title={motif ?? ""}>Annulée le {le.toLocaleDateString("fr-FR")}{motif ? ` — ${motif}` : ""}</span>;
}
