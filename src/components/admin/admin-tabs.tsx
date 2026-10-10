import Link from "next/link";
import type { SessionUser } from "@/lib/auth";

// Sous-onglets du module Administration ; seuls ceux autorisés au compte sont affichés
export function AdminTabs({ user, current }: { user: SessionUser; current: "equipe" | "comptes" | "roles" | "journal" | "parametres" }) {
  const tabs = [
    { id: "equipe", label: "Équipe dirigeante", href: "/gestion/administration", ok: user.perms.ADMINISTRATION.voir },
    { id: "comptes", label: "Comptes", href: "/gestion/administration/comptes", ok: user.role.superAdmin },
    { id: "roles", label: "Rôles et permissions", href: "/gestion/administration/roles", ok: user.role.superAdmin },
    { id: "journal", label: "Journal d'audit", href: "/gestion/administration/journal", ok: user.role.superAdmin },
    { id: "parametres", label: "Paramètres", href: "/gestion/administration/parametres", ok: user.role.superAdmin },
  ].filter((t) => t.ok);
  if (tabs.length < 2) return null;
  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto rounded-3xl bg-white p-2">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === current ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2.5 font-semibold transition ${t.id === current ? "bg-navy text-white" : "text-navy hover:bg-mist"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
