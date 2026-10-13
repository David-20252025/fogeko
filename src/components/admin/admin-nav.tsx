"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Module } from "@/generated/prisma/enums";
import { MODULES } from "@/lib/permissions";

const I: Record<Module, string> = {
  MEMBRES: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6",
  ACTUALITES: "M5 4h11v16H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1ZM16 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-4 0M8 8h5M8 12h5M8 16h3",
  GALERIE: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01",
  ACTIONS: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  FINANCES: "M3 6h18v12H3zM3 10h18M7 15h3",
  ARCHIVES: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  ADMINISTRATION: "M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z",
  TEXTES: "M4 6h16M4 12h10M4 18h16",
  MESSAGES: "M3 5h18v14H3zM3 7l9 6 9-6",
};
const DASHBOARD_ICON = "M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z";
const USERS_ICON = "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M17 11l2 2 4-4";
// La gestion des comptes a aussi son entrée « Utilisateurs » (super admin)
const estComptes = (p: string) => p.startsWith("/gestion/utilisateurs") || p.startsWith("/gestion/administration/comptes");

/** Menu : le tableau de bord, puis les 9 modules dans l'ordre imposé, uniquement ceux que le compte peut voir. */
export function AdminNav({ visible, unread, utilisateurs = false }: { visible: Module[]; unread: number; utilisateurs?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Gestion" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      <Link href="/gestion" aria-current={path === "/gestion" ? "page" : undefined}
        className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition lg:py-3 ${path === "/gestion" ? "bg-navy text-white" : "text-ink/70 hover:bg-mist hover:text-navy"}`}>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={DASHBOARD_ICON} /></svg>
        Tableau de bord
      </Link>
      {MODULES.filter((m) => visible.includes(m.key)).map((m) => {
        const active = path.startsWith(m.href) && !(m.key === "ADMINISTRATION" && estComptes(path));
        return (
          <Link key={m.key} href={m.href} aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition lg:py-3 ${active ? "bg-navy text-white" : "text-ink/70 hover:bg-mist hover:text-navy"}`}>
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={I[m.key]} /></svg>
            {m.label}
            {m.key === "MESSAGES" && unread > 0 && <span className="ml-auto rounded-full bg-rouge-600 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
          </Link>
        );
      })}
      {utilisateurs && (
        <Link href="/gestion/utilisateurs" aria-current={estComptes(path) ? "page" : undefined}
          className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition lg:py-3 ${estComptes(path) ? "bg-navy text-white" : "text-ink/70 hover:bg-mist hover:text-navy"}`}>
          <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={USERS_ICON} /></svg>
          Utilisateurs
        </Link>
      )}
    </nav>
  );
}
