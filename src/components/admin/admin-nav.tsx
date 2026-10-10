"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";

const I = {
  dash: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  users: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6",
  news: "M5 4h11v16H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1ZM16 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-4 0M8 8h5M8 12h5M8 16h3",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  text: "M4 6h16M4 12h10M4 18h16",
  mail: "M3 5h18v14H3zM3 7l9 6 9-6",
  shield: "M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z",
  cash: "M3 6h18v12H3zM3 10h18M7 15h3",
  team: "M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 20a6 6 0 0 1 12 0M5 9.5a2 2 0 1 0 0-4M19 9.5a2 2 0 1 1 0-4M2 17a3.5 3.5 0 0 1 3-3.4M22 17a3.5 3.5 0 0 0-3-3.4",
};

const LINKS: { href: string; label: string; icon: keyof typeof I; roles?: Role[] }[] = [
  { href: "/gestion", label: "Tableau de bord", icon: "dash" },
  { href: "/gestion/membres", label: "Membres", icon: "users" },
  { href: "/gestion/actualites", label: "Actualités", icon: "news", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/galerie", label: "Galerie", icon: "image", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/actions", label: "Actions", icon: "heart", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/finances", label: "Finances", icon: "cash", roles: ["SUPERADMIN", "ADMIN"] },
  { href: "/gestion/administration", label: "Administration", icon: "team", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/site", label: "Textes du site", icon: "text", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/messages", label: "Messages", icon: "mail", roles: ["SUPERADMIN", "ADMIN", "SECRETAIRE"] },
  { href: "/gestion/utilisateurs", label: "Utilisateurs", icon: "shield", roles: ["SUPERADMIN", "ADMIN"] },
];

export function AdminNav({ role, unread }: { role: Role; unread: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Gestion" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LINKS.filter((l) => !l.roles || l.roles.includes(role)).map((l) => {
        const active = l.href === "/gestion" ? path === l.href : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium transition lg:py-3 ${active ? "bg-navy text-white" : "text-ink/70 hover:bg-mist hover:text-navy"}`}>
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={I[l.icon]} /></svg>
            {l.label}
            {l.icon === "mail" && unread > 0 && <span className="ml-auto rounded-full bg-rouge-600 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
