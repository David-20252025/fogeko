import { FinanceTabs } from "@/components/admin/finance-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";

// shortcut: page d'attente, remplacée par les rapports PDF et l'export Excel (phase 4)
export default async function RapportsPage() {
  await requirePerm("FINANCES");
  return (
    <div className="space-y-4">
      <PageHead title="Finances" sub="Rapports PDF et export Excel" />
      <FinanceTabs current="rapports" />
      <p className="rounded-3xl bg-white p-10 text-center text-ink/70">Les rapports PDF (logo, filigrane, pied de page) arrivent à la prochaine étape.</p>
    </div>
  );
}
