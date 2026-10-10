import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountForm } from "@/components/admin/account-form";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/members";
import { computePerms } from "@/lib/permissions";
import { saveAccount } from "../actions";

export default async function AccountEdit(props: PageProps<"/gestion/administration/comptes/[id]">) {
  const me = await requireSuperAdmin();
  const { id } = await props.params;
  const [roles, u] = await Promise.all([
    db.role.findMany({ orderBy: { id: "asc" }, include: { permissions: true } }),
    id === "nouveau" ? null : db.user.findUnique({ where: { id }, include: { role: { include: { permissions: true } }, permissions: true } }),
  ]);
  if (id !== "nouveau" && !u) notFound();

  return (
    <div className="space-y-4">
      <AdminTabs user={me} current="comptes" />
      <Link href="/gestion/administration/comptes" className="inline-block font-semibold text-navy hover:text-rouge-600">← Comptes</Link>
      <section className="rounded-3xl bg-white p-6">
        <h1 className="font-slab mb-6 text-3xl font-bold text-navy">{u ? `Modifier le compte de ${u.name}` : "Nouveau compte"}</h1>
        <AccountForm
          action={saveAccount.bind(null, u?.id ?? null)}
          roles={roles.map((r) => ({ id: r.id, nom: r.nom, superAdmin: r.superAdmin, perms: computePerms(r.superAdmin, r.permissions) }))}
          account={u ? { name: u.name, email: u.email, roleId: u.roleId, photo: u.photo, perms: computePerms(u.role.superAdmin, u.role.permissions, u.permissions) } : undefined}
          photoSrc={u?.photo ? photoUrl(u.photo) : undefined}
        />
      </section>
    </div>
  );
}
