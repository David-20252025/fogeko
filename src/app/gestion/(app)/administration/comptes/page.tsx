import Link from "next/link";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHead } from "@/components/admin/page-head";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/members";
import { deleteAccount, unlockAccount } from "./actions";

export default async function AccountsPage() {
  const me = await requireSuperAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { role: true, _count: { select: { dons: true, fonds: true, permissions: true } } },
  });

  return (
    <div className="space-y-4">
      <AdminTabs user={me} current="comptes" />
      <PageHead title="Comptes" sub={`${users.length} compte(s) ayant accès à l'espace de gestion`} action={{ href: "/gestion/administration/comptes/nouveau", label: "+ Nouveau compte" }} />
      <ul className="grid gap-3 md:grid-cols-2">
        {users.map((u) => {
          const locked = u.lockedUntil && u.lockedUntil > new Date();
          return (
            <li key={u.id} className="flex items-center gap-4 rounded-3xl bg-white p-4">
              {u.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- photo protégée
                <img src={photoUrl(u.photo)} alt="" className="size-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ocre/20 text-xs font-semibold text-ink/70" title="Photo manquante">sans photo</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-navy">{u.name} {u.id === me.id && <span className="ml-1 rounded-full bg-mist px-2 py-0.5 text-xs">vous</span>}</p>
                <p className="truncate text-sm text-ink/70">{u.email}</p>
                <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${u.role.superAdmin ? "bg-navy text-white" : "bg-mist text-navy"}`}>{u.role.nom}</span>
                  {u._count.permissions > 0 && <span className="rounded-full bg-ocre/20 px-2 py-0.5 font-semibold">permissions personnalisées</span>}
                  {locked && <span className="rounded-full bg-rouge/10 px-2 py-0.5 font-semibold text-rouge-600">bloqué</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 text-sm">
                <Link href={`/gestion/administration/comptes/${u.id}`} className="rounded-full border-2 border-navy/15 px-3 py-1.5 font-semibold text-navy hover:border-navy">Modifier</Link>
                {locked && <form action={unlockAccount.bind(null, u.id)}><button className="font-semibold text-navy hover:underline">Débloquer</button></form>}
                {u.id !== me.id && u._count.dons + u._count.fonds === 0 && (
                  <form action={deleteAccount.bind(null, u.id)}>
                    <ConfirmButton message={`Supprimer le compte ${u.email} ?`} className="font-semibold text-rouge-600 hover:underline">Supprimer</ConfirmButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
