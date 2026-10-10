import { AdminForm } from "@/components/admin/admin-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { admInput, admLabel, Text } from "@/components/admin/fields";
import { PageHead } from "@/components/admin/page-head";
import type { Role } from "@/generated/prisma/enums";
import { ADMINS, requireUser } from "@/lib/auth";
import { assignableRoles, canManage, ROLE_LABELS } from "@/lib/roles";
import { db } from "@/lib/db";
import { createUser, deleteUser, unlockUser, updateUser } from "./actions";

function RoleSelect({ value, id = "role", roles }: { value?: Role; id?: string; roles: Role[] }) {
  return (
    <div>
      <label className={admLabel} htmlFor={id}>Rôle</label>
      <select id={id} name="role" defaultValue={value ?? "SECRETAIRE"} className={admInput}>
        {roles.map((k) => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}
      </select>
    </div>
  );
}

export default async function UsersAdmin() {
  const me = await requireUser(ADMINS);
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { dons: true, fonds: true } } } });
  const roles = assignableRoles(me.role);

  return (
    <div className="space-y-4">
      <PageHead title="Utilisateurs" sub="Les personnes qui ont accès à cet espace de gestion" />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <ul className="space-y-3">
          {users.map((u) => {
            const locked = u.lockedUntil && u.lockedUntil > new Date();
            const manageable = canManage(me.role, u.role);
            return (
              <li key={u.id} className="rounded-3xl bg-white p-5">
                <p className="mb-3 font-semibold text-navy">
                  {u.email} {u.id === me.id && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs">vous</span>}
                  {locked && <span className="ml-2 rounded-full bg-rouge/10 px-2 py-0.5 text-xs text-rouge-600">bloqué</span>}
                </p>
                {!manageable ? (
                  <p className="text-ink/70">{u.name} · {ROLE_LABELS[u.role]} <span className="text-sm">(modifiable uniquement par un super administrateur)</span></p>
                ) : (
                <AdminForm action={updateUser.bind(null, u.id)}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Text name="name" id={`name-${u.id}`} label="Nom" defaultValue={u.name} required />
                    <RoleSelect value={u.role} id={`role-${u.id}`} roles={roles.includes(u.role) ? roles : [u.role, ...roles]} />
                    <Text name="password" id={`password-${u.id}`} label="Nouveau mot de passe" type="password" autoComplete="new-password" minLength={10} placeholder="(inchangé)" />
                  </div>
                </AdminForm>
                )}
                <div className="mt-3 flex gap-4">
                  {locked && manageable && <form action={unlockUser.bind(null, u.id)}><button className="text-sm font-semibold text-navy hover:underline">Débloquer</button></form>}
                  {u.id !== me.id && manageable && u._count.dons + u._count.fonds === 0 && (
                    <form action={deleteUser.bind(null, u.id)}>
                      <ConfirmButton message={`Supprimer le compte ${u.email} ?`} className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer le compte</ConfirmButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <aside className="h-fit rounded-3xl bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-navy">Nouveau compte</h2>
          <AdminForm resetOnSuccess action={createUser} submit="Créer le compte">
            <Text name="name" label="Nom" required />
            <Text name="email" label="Email" type="email" required autoComplete="off" />
            <RoleSelect roles={roles} />
            <Text name="password" label="Mot de passe (10 caractères min.)" type="password" required minLength={10} autoComplete="new-password" hint="Transmettez-le en main propre ; la personne pourra demander à le changer." />
          </AdminForm>
        </aside>
      </div>
    </div>
  );
}
