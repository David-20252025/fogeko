import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHead } from "@/components/admin/page-head";
import { can, EDITORS, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteMessage, toggleRead } from "../content-actions";

export default async function MessagesAdmin() {
  const user = await requireUser(EDITORS);
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="space-y-4">
      <PageHead title="Messages" sub="Reçus via le formulaire de contact du site" />
      {messages.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-ink/70">Aucun message.</p>}
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id} className={`rounded-3xl bg-white p-5 ${m.lu ? "" : "ring-2 ring-rouge/30"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-navy">{!m.lu && <span className="mr-2 inline-block size-2 rounded-full bg-rouge align-middle" />}{m.nom}</p>
                <p className="text-sm text-ink/70">
                  {m.telephone && <a href={`tel:${m.telephone}`} className="underline">{m.telephone}</a>}
                  {m.telephone && m.email && " · "}
                  {m.email && <a href={`mailto:${m.email}`} className="underline">{m.email}</a>}
                  {" · "}{m.createdAt.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleRead.bind(null, m.id)}>
                  <button className="rounded-full border-2 border-navy/10 px-3 py-1 text-sm font-semibold text-navy hover:border-navy">{m.lu ? "Marquer non lu" : "Marquer lu"}</button>
                </form>
                {can.delete(user.role) && (
                  <form action={deleteMessage.bind(null, m.id)}>
                    <ConfirmButton message="Supprimer ce message ?" className="px-2 text-sm font-semibold text-rouge-600">Supprimer</ConfirmButton>
                  </form>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-ink/85">{m.message}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
