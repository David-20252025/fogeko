import Image from "next/image";
import Link from "next/link";
import { PageHead } from "@/components/admin/page-head";
import { EDITORS, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ActionsAdmin() {
  await requireUser(EDITORS);
  const actions = await db.action.findMany({ orderBy: { ordre: "asc" } });
  return (
    <div className="space-y-4">
      <PageHead title="Actions" sub="Les actions présentées sur l'accueil et la page Actions" action={{ href: "/gestion/actions/nouveau", label: "+ Nouvelle action" }} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <li key={a.id}>
            <Link href={`/gestion/actions/${a.id}`} className="block overflow-hidden rounded-3xl bg-white transition hover:ring-2 hover:ring-navy/20">
              <div className="relative aspect-[4/3]"><Image src={a.image} alt="" fill sizes="25vw" className="object-cover object-top" /></div>
              <div className="p-4">
                <p className="text-sm text-ink/65">Ordre {a.ordre} · {a.publiee ? "Publiée" : "Masquée"}</p>
                <p className="font-semibold text-navy">{a.titre}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
