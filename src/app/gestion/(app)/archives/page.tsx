import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { AdminForm } from "@/components/admin/admin-form";
import { ArchiveUploader } from "@/components/admin/archive-uploader";
import { PageHead } from "@/components/admin/page-head";
import { PdfThumb } from "@/components/admin/pdf-thumb";
import { CATEGORIES_ARCHIVE } from "@/lib/archive-file";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { supprimerArchive } from "./actions";

const PER_PAGE = 24;
const field = "min-w-0 rounded-xl border-2 border-navy/10 bg-white px-3 py-2.5 outline-none focus:border-navy";
const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.ceil(o / 1024)} Ko`);

export default async function ArchivesPage(props: PageProps<"/gestion/archives">) {
  const user = await requirePerm("ARCHIVES");
  const sp = await props.searchParams;
  const p = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string).slice(0, 80) : undefined);
  const q = p("q"), categorie = p("categorie"), type = p("type"), du = p("du"), au = p("au");
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ArchiveWhereInput = {
    supprimeeLe: null,
    ...(categorie && categorie in CATEGORIES_ARCHIVE && { categorie: categorie as keyof typeof CATEGORIES_ARCHIVE }),
    ...(type === "pdf" && { mime: "application/pdf" }),
    ...(type === "image" && { mime: { startsWith: "image/" } }),
    ...((du || au) && { dateDocument: { ...(du && { gte: new Date(`${du}T00:00:00Z`) }), ...(au && { lte: new Date(`${au}T23:59:59Z`) }) } }),
    ...(q && {
      OR: [
        { titre: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { nomOriginal: { contains: q, mode: "insensitive" } },
        { motsCles: { has: q.toLowerCase() } },
      ],
    }),
  };
  const [archives, total] = await Promise.all([
    db.archive.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { importePar: { select: { name: true } } } }),
    db.archive.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (n: number) => `?${new URLSearchParams({ ...(q && { q }), ...(categorie && { categorie }), ...(type && { type }), ...(du && { du }), ...(au && { au }), page: String(n) })}`;

  return (
    <div className="space-y-4">
      <PageHead title="Archives" sub={`${total} document(s) — stockés hors du site public, accessibles selon les permissions`} />

      {user.perms.ARCHIVES.creer && (
        <section className="rounded-3xl bg-white p-6">
          <h2 className="mb-4 text-xl font-bold text-navy">Importer des documents</h2>
          <ArchiveUploader />
        </section>
      )}

      <form className="grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]" aria-label="Filtres">
        <input name="q" type="search" defaultValue={q} placeholder="Titre, description ou mot-clé" aria-label="Recherche" className={field} />
        <select name="categorie" defaultValue={categorie ?? ""} aria-label="Catégorie" className={field}>
          <option value="">Toutes catégories</option>{Object.entries(CATEGORIES_ARCHIVE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select name="type" defaultValue={type ?? ""} aria-label="Type" className={field}><option value="">PDF et images</option><option value="pdf">PDF</option><option value="image">Images</option></select>
        <input type="date" name="du" defaultValue={du} aria-label="Document daté du" className={field} />
        <input type="date" name="au" defaultValue={au} aria-label="au" className={field} />
        <button className="rounded-xl bg-navy px-5 py-2.5 font-semibold text-white">Filtrer</button>
      </form>

      {archives.length === 0 ? <p className="rounded-3xl bg-white p-10 text-center text-ink/70">Aucun document.</p> : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {archives.map((a) => {
            const url = `/gestion/archives/fichier/${a.id}`;
            return (
              <li key={a.id} className="flex flex-col overflow-hidden rounded-3xl bg-white">
                <a href={url} target="_blank" className="block aspect-[4/3] overflow-hidden bg-mist" title="Ouvrir">
                  {a.mime === "application/pdf" ? <PdfThumb src={url} titre={a.titre} /> : (
                    // eslint-disable-next-line @next/next/no-img-element -- fichier protégé servi après contrôle des droits
                    <img src={url} alt={a.titre} loading="lazy" className="size-full object-cover" />
                  )}
                </a>
                <div className="flex flex-1 flex-col gap-1 p-4 text-sm">
                  <p className="font-semibold break-words text-navy">{a.titre}</p>
                  <p className="text-ink/70">
                    <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-navy">{CATEGORIES_ARCHIVE[a.categorie]}</span>{" "}
                    {a.mime === "application/pdf" ? "PDF" : "Image"} · {taille(a.taille)}
                  </p>
                  {a.dateDocument && <p className="text-ink/70">Document du {a.dateDocument.toLocaleDateString("fr-FR", { timeZone: "UTC" })}</p>}
                  {a.description && <p className="line-clamp-2 text-ink/70">{a.description}</p>}
                  {a.motsCles.length > 0 && <p className="text-xs text-ink/65">{a.motsCles.map((m) => `#${m}`).join(" ")}</p>}
                  <p className="text-xs text-ink/65">Importé par {a.importePar.name} le {a.createdAt.toLocaleDateString("fr-FR")}</p>
                  <div className="mt-auto flex flex-wrap gap-3 pt-2">
                    <a href={url} target="_blank" className="font-semibold text-navy underline">Ouvrir</a>
                    {user.perms.ARCHIVES.exporter && <a href={`${url}?telecharger`} className="font-semibold text-navy underline">Télécharger</a>}
                  </div>
                  {user.role.superAdmin && (
                    <details className="pt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-rouge-600">Supprimer</summary>
                      <div className="mt-2 rounded-xl bg-mist p-3">
                        <AdminForm action={supprimerArchive.bind(null, a.id)} submit="Supprimer définitivement" className="grid gap-2">
                          <label htmlFor={`motif-${a.id}`} className="text-xs font-semibold text-ink/70">Motif (obligatoire)</label>
                          <textarea id={`motif-${a.id}`} name="motif" required minLength={5} rows={2} className="rounded-lg border-2 border-navy/10 p-2" />
                        </AdminForm>
                      </div>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && <Link href={href(page - 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">← Précédent</Link>}
          <span className="text-ink/70">Page {page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="rounded-full bg-white px-5 py-2.5 font-semibold text-navy">Suivant →</Link>}
        </nav>
      )}
    </div>
  );
}
