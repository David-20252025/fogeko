import { STATUTS } from "@/lib/members";

export function StatutBadge({ statut }: { statut: keyof typeof STATUTS }) {
  const c = { ACTIF: "bg-emerald-50 text-emerald-700 ring-emerald-200", EN_ATTENTE: "bg-amber-50 text-amber-700 ring-amber-200", SUSPENDU: "bg-rouge/10 text-rouge-600 ring-rouge/20" }[statut];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${c}`}>{STATUTS[statut]}</span>;
}
