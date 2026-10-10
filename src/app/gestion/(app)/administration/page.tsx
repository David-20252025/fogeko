import Image from "next/image";
import Link from "next/link";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PageHead } from "@/components/admin/page-head";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BoardAdmin() {
  const user = await requirePerm("ADMINISTRATION");
  const people = await db.dirigeant.findMany({ orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] });
  return (
    <div className="space-y-4">
      <AdminTabs user={user} current="equipe" />
      <PageHead
        title="Administration"
        sub="Les membres de l'administration affichés sur la page publique « Administration »"
        action={user.perms.ADMINISTRATION.creer ? { href: "/gestion/administration/nouveau", label: "+ Ajouter une personne" } : undefined}
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {people.map((p) => (
          <li key={p.id}>
            <Link href={`/gestion/administration/${p.id}`} className="block overflow-hidden rounded-3xl bg-white transition hover:ring-2 hover:ring-navy/20">
              <div className="relative aspect-[4/5]"><Image src={p.photo} alt="" fill sizes="25vw" className="object-cover object-top" /></div>
              <div className="p-4">
                <p className="font-semibold text-navy">{p.prenom} {p.nom} {p.postNom}</p>
                <p className="text-sm text-ink/70">{p.poste}</p>
                <p className="mt-1 text-xs text-ink/65">Ordre {p.ordre} · {p.publie ? "Publié" : "Masqué"}</p>
              </div>
            </Link>
          </li>
        ))}
        {people.length === 0 && <li className="rounded-3xl bg-white p-10 text-center text-ink/70 sm:col-span-2 xl:col-span-4">Personne pour l&apos;instant.</li>}
      </ul>
    </div>
  );
}
