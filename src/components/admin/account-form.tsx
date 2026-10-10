"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/components/admin/admin-form";
import type { Perms } from "@/lib/permissions";
import { keepOnSubmit } from "@/lib/use-keep-form";
import { admInput, admLabel } from "./fields";
import { PermissionGrid } from "./permission-grid";

type RoleOpt = { id: number; nom: string; superAdmin: boolean; perms: Perms };
type Account = { name: string; email: string; roleId: number; photo: string | null; perms: Perms };

export function AccountForm({ action, roles, account, photoSrc }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  roles: RoleOpt[];
  account?: Account;
  photoSrc?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [roleId, setRoleId] = useState(account?.roleId ?? roles.find((r) => !r.superAdmin)?.id ?? roles[0].id);
  const role = roles.find((r) => r.id === roleId)!;
  const [preview, setPreview] = useState(photoSrc);
  // Garder les permissions du compte tant que son rôle ne change pas ; sinon repartir de celles du nouveau rôle
  const initial = account && roleId === account.roleId ? account.perms : role.perms;

  return (
    <form onSubmit={keepOnSubmit(dispatch)} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <label className="mx-auto grid size-28 cursor-pointer place-items-center overflow-hidden rounded-full bg-mist ring-4 ring-ocre/40 hover:ring-ocre" title="Choisir la photo">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- aperçu local ou photo protégée
            <img src={preview} alt="Photo de profil" className="size-full object-cover" />
          ) : (
            <span className="px-3 text-center text-sm font-semibold text-navy">Photo obligatoire</span>
          )}
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required={!account} className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="name" className={admLabel}>Nom complet</label><input id="name" name="name" defaultValue={account?.name} required className={admInput} /></div>
          <div><label htmlFor="email" className={admLabel}>Email</label><input id="email" name="email" type="email" defaultValue={account?.email} required autoComplete="off" className={admInput} /></div>
          <div>
            <label htmlFor="password" className={admLabel}>{account ? "Nouveau mot de passe" : "Mot de passe (10 caractères min.)"}</label>
            <input id="password" name="password" type="password" minLength={10} required={!account} autoComplete="new-password" placeholder={account ? "(inchangé)" : ""} className={admInput} />
          </div>
          <div>
            <label htmlFor="roleId" className={admLabel}>Rôle</label>
            <select id="roleId" name="roleId" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} className={admInput}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 font-semibold text-navy">Modules accessibles et permissions</p>
        {role.superAdmin ? (
          <p className="rounded-xl bg-mist p-3 text-sm text-ink/80">Super admin : toutes les permissions sur tous les modules, plus les actions réservées (comptes, rôles, journal, membres rémunérés, suppression d&apos;archives).</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-ink/70">Pré-remplies avec celles du rôle « {role.nom} » ; modifiez-les si ce compte doit avoir des droits particuliers.</p>
            <PermissionGrid key={roleId} initial={initial} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="rounded-full bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Enregistrement…" : account ? "Enregistrer" : "Créer le compte"}
        </button>
        {state.error && <p className="font-semibold text-rouge-600" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
