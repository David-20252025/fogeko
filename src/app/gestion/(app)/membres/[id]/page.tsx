import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { MemberEditForm } from "@/components/admin/member-edit-form";
import { StatutBadge } from "@/components/admin/statut-badge";
import { can, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIES, formatNumero, photoUrl } from "@/lib/members";
import { deleteMember, setStatut } from "../actions";

export default async function MemberPage(props: PageProps<"/gestion/membres/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const [m, communes] = await Promise.all([
    db.member.findUnique({ where: { id }, include: { commune: true } }),
    db.commune.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  if (!m) notFound();
  const editor = can.edit(user.role);
  const quick =
    m.statut === "EN_ATTENTE" ? { s: "ACTIF" as const, l: "Valider l'adhésion", c: "bg-emerald-600 text-white hover:bg-emerald-700" }
    : m.statut === "ACTIF" ? { s: "SUSPENDU" as const, l: "Suspendre", c: "border-2 border-rouge/30 text-rouge-600 hover:bg-rouge/5" }
    : { s: "ACTIF" as const, l: "Réactiver", c: "bg-emerald-600 text-white hover:bg-emerald-700" };

  return (
    <div className="space-y-4">
      <Link href="/gestion/membres" className="inline-block font-semibold text-navy hover:text-rouge-600">← Membres</Link>
      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <aside className="h-fit rounded-3xl bg-white p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- photo protégée */}
          <img src={photoUrl(m.photo)} alt={`Photo de ${m.prenom} ${m.nom}`} width={400} height={400} className="mx-auto size-44 rounded-full object-cover ring-4 ring-ocre" />
          <h1 className="font-slab mt-5 text-2xl font-bold text-navy">{m.prenom} {m.nom} {m.postNom}</h1>
          <p className="mt-1 text-lg font-bold text-rouge-600">{formatNumero(m.numero)}</p>
          <div className="mt-3 flex justify-center gap-2"><StatutBadge statut={m.statut} /><span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-navy">{CATEGORIES[m.categorie]}</span></div>
          <dl className="mt-6 space-y-2 text-left text-sm">
            {[
              ["Téléphone", <a key="t" href={`tel:${m.telephone}`} className="font-semibold text-navy underline">{m.telephone}</a>],
              ["Commune", `${m.commune.nom} · ${m.quartier}`],
              ["Adhésion", m.dateAdhesion.toLocaleDateString("fr-FR")],
              ["Consentement", m.consentement ? `Oui, le ${m.consentementDate.toLocaleDateString("fr-FR")}` : "Non"],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-3 border-b border-navy/5 pb-2"><dt className="text-ink/65">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {editor && (
            <div className="mt-6 grid gap-2">
              <form action={setStatut.bind(null, m.id, quick.s)}>
                <button className={`w-full rounded-full px-5 py-3 font-semibold ${quick.c}`}>{quick.l}</button>
              </form>
              <Link href={`/gestion/impression/cartes?id=${m.id}`} target="_blank" className="rounded-full border-2 border-navy px-5 py-3 font-semibold text-navy hover:bg-navy hover:text-white">Imprimer la carte</Link>
              <a href={`https://wa.me/${m.telephone.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="rounded-full bg-[#25D366] px-5 py-3 font-semibold text-white">Écrire sur WhatsApp</a>
            </div>
          )}
          {can.delete(user.role) && (
            <form action={deleteMember.bind(null, m.id)} className="mt-6 border-t border-navy/5 pt-4">
              <ConfirmButton message={`Supprimer définitivement ${m.prenom} ${m.nom} et sa photo ?`} className="text-sm font-semibold text-rouge-600 hover:underline">Supprimer ce membre</ConfirmButton>
            </form>
          )}
        </aside>
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-5 text-xl font-bold text-navy">{editor ? "Modifier la fiche" : "Fiche du membre"}</h2>
          <MemberEditForm
            key={m.statut} // le bouton rapide change le statut hors du formulaire : on le recharge
            readOnly={!editor}
            communes={communes}
            m={{ ...m, dateNaissance: m.dateNaissance?.toISOString().slice(0, 10) ?? "" }}
          />
        </section>
      </div>
    </div>
  );
}
