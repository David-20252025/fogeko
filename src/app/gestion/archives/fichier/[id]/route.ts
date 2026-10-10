import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readArchiveFile } from "@/lib/storage";

// Fichier d'archive servi après contrôle : module Archives, ou Finances pour les justificatifs financiers
export async function GET(req: Request, ctx: RouteContext<"/gestion/archives/fichier/[id]">) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const a = await db.archive.findUnique({ where: { id: Number((await ctx.params).id) || 0 } });
  if (!a || a.supprimeeLe) return new Response("Introuvable", { status: 404 });
  const download = new URL(req.url).searchParams.has("telecharger");
  // Voir = ouvrir dans le navigateur ; télécharger = permission « exporter »
  const action = download ? "exporter" : "voir";
  const ok = user.perms.ARCHIVES[action] || (a.categorie === "FINANCIER" && user.perms.FINANCES[action]);
  if (!ok) return new Response("Accès refusé", { status: 403 });
  const file = await readArchiveFile(a.fichier);
  if (!file) return new Response("Fichier manquant", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": a.mime,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(a.nomOriginal)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
