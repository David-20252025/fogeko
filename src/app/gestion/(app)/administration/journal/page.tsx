import Link from "next/link";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const PER_PAGE = 50;
const field = "min-w-0 rounded-xl border-2 border-navy/10 bg-white px-3.5 py-2.5 outline-none focus:border-navy";

export default async function AuditPage(props: PageProps<"/gestion/administration/journal">) {
  const me = await requireSuperAdmin();
  const sp = await props.searchParams;
  const userId = typeof sp.userId === "string" && sp.userId ? sp.userId : undefined;
  const action = typeof sp.action === "string" && sp.action ? sp.action.slice(0, 40) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = { ...(userId && { userId }), ...(action && { action: { contains: action } }) };

  const [logs, total, users] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { user: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => `?${new URLSearchParams({ ...(userId && { userId }), ...(action && { action }), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <AdminTabs user={me} current="journal" />
      <PageHead title="Journal d'audit" sub={`${total} action(s) enregistrée(s) : qui, quoi, quand, adresse IP`} />
      <form className="grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" aria-label="Filtres">
        <select name="userId" defaultValue={userId ?? ""} aria-label="Utilisateur" className={field}>
          <option value="">Tous les utilisateurs</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input name="action" defaultValue={action} placeholder="Action (ex. compte, connexion, don…)" aria-label="Action" className={field} />
        <button className="rounded-xl bg-navy px-5 py-2.5 font-semibold text-white">Filtrer</button>
      </form>
      <div className="overflow-x-auto rounded-3xl bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-mist/60 text-ink/70">
            <tr>{["Date", "Utilisateur", "Action", "Élément", "Détails", "Adresse IP"].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {logs.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="px-4 py-2.5 whitespace-nowrap">{l.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}</td>
                <td className="px-4 py-2.5">{l.user?.name ?? <em className="text-ink/65">—</em>}</td>
                <td className="px-4 py-2.5 font-semibold text-navy">{l.action}</td>
                <td className="px-4 py-2.5 text-ink/70">{l.entite}{l.entiteId && ` #${l.entiteId.slice(0, 8)}`}</td>
                <td className="max-w-xs px-4 py-2.5 font-mono text-xs break-words text-ink/70">{l.details ? JSON.stringify(l.details).slice(0, 220) : ""}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.ip}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-ink/70">Aucune action enregistrée.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && <Link href={href(page - 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">← Plus récentes</Link>}
          <span className="text-ink/70">Page {page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">Plus anciennes →</Link>}
        </nav>
      )}
    </div>
  );
}
