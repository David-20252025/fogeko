import { AdminForm } from "@/components/admin/admin-form";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { admInput, admLabel, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import { PermissionGrid } from "@/components/admin/permission-grid";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { computePerms } from "@/lib/permissions";
import { createRole, deleteRole, saveRole } from "./actions";

export default async function RolesPage() {
  const me = await requireSuperAdmin();
  const roles = await db.role.findMany({ orderBy: { id: "asc" }, include: { permissions: true, _count: { select: { users: true } } } });

  return (
    <div className="space-y-4">
      <AdminTabs user={me} current="roles" />
      <PageHead title="Rôles et permissions" sub="Matrice rôles × modules. Les comptes peuvent en plus avoir des permissions personnalisées." />

      {roles.map((r) => (
        <section key={r.id} className="rounded-3xl bg-white p-6">
          {r.superAdmin ? (
            <>
              <h2 className="text-xl font-bold text-navy">{r.nom} <span className="text-sm font-normal text-ink/70">· {r._count.users} compte(s)</span></h2>
              <p className="mt-2 text-ink/80">Toutes les permissions sur tous les modules, non modifiable. Actions réservées : comptes et rôles, journal d&apos;audit, membres rémunérés, suppression d&apos;archives, fonds mensuel.</p>
            </>
          ) : (
            <AdminForm action={saveRole.bind(null, r.id)} submit={`Enregistrer « ${r.nom} »`}>
              <div className="flex flex-wrap items-end gap-3">
                <Text name="nom" id={`nom-${r.id}`} label="Nom du rôle" defaultValue={r.nom} required className="min-w-56 flex-1" />
                <p className="pb-2.5 text-sm text-ink/70">{r._count.users} compte(s)</p>
              </div>
              <PermissionGrid initial={computePerms(false, r.permissions)} />
            </AdminForm>
          )}
          {!r.superAdmin && r._count.users === 0 && (
            <form action={deleteRole.bind(null, r.id)} className="mt-3">
              <ConfirmButton message={`Supprimer le rôle « ${r.nom} » ?`} className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer ce rôle</ConfirmButton>
            </form>
          )}
        </section>
      ))}

      <section className="rounded-3xl bg-white p-6">
        <h2 className="mb-4 text-xl font-bold text-navy">Nouveau rôle</h2>
        <AdminForm action={createRole} resetOnSuccess submit="Créer le rôle">
          <div className="grid gap-3 sm:grid-cols-2">
            <Text name="nom" id="nouveau-role" label="Nom" required placeholder="ex. Coordinateur de commune" />
            <div>
              <label htmlFor="modele" className={admLabel}>Partir des permissions de</label>
              <select id="modele" name="modele" className={admInput} defaultValue="">
                <option value="">Aucune (tout décoché)</option>
                {roles.filter((r) => !r.superAdmin).map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>
          </div>
        </AdminForm>
      </section>
    </div>
  );
}
