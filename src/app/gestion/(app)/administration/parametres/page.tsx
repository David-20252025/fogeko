import { AdminForm, type FormState } from "@/components/admin/admin-form";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { Area, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { audit } from "@/lib/audit";
import { assertSuperAdmin, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function saveParametres(_: FormState, f: FormData): Promise<FormState> {
  "use server";
  const me = await assertSuperAdmin();
  const adresse = String(f.get("adresseFondation") ?? "").trim().slice(0, 500);
  const tauxRaw = String(f.get("tauxUsdCdf") ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const taux = tauxRaw ? Number(tauxRaw) : null;
  if (taux !== null && !(taux > 0 && taux < 1_000_000)) return { error: "Taux invalide (ex. 2850)." };
  await db.parametres.upsert({
    where: { id: 1 },
    update: { adresseFondation: adresse || null, tauxUsdCdf: taux === null ? null : String(taux) },
    create: { adresseFondation: adresse || null, tauxUsdCdf: taux === null ? null : String(taux) },
  });
  await audit(me.id, "parametres.modification", "Parametres", 1, { adresseFondation: adresse, tauxUsdCdf: taux });
  revalidatePath("/gestion/administration/parametres");
  return { ok: true };
}

export default async function ParametresPage() {
  const me = await requireSuperAdmin();
  const p = await db.parametres.findUnique({ where: { id: 1 } });
  return (
    <div className="space-y-4">
      <AdminTabs user={me} current="parametres" />
      <PageHead title="Paramètres" sub="Informations internes utilisées par les rapports et documents PDF" />
      <section className="rounded-3xl bg-white p-6">
        <AdminForm action={saveParametres}>
          <Area name="adresseFondation" label="Adresse de la fondation (pied de page des rapports, reçus et bordereaux)" defaultValue={p?.adresseFondation ?? ""} rows={3}
            hint="Adresse postale complète. Si elle est vide, la génération des rapports vous le signalera." />
          <Text name="tauxUsdCdf" label="Taux de change par défaut : 1 USD = … CDF (facultatif)" defaultValue={p?.tauxUsdCdf?.toString() ?? ""} inputMode="decimal" placeholder="ex. 2850"
            hint="Sert uniquement aux totaux convertis des rapports ; les montants restent toujours affichés dans leur devise." />
        </AdminForm>
      </section>
    </div>
  );
}
