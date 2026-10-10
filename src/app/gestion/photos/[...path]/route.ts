import { getUser } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

// Photos des membres : uniquement pour l'équipe connectée, jamais mises en cache partagé
export async function GET(_: Request, ctx: RouteContext<"/gestion/photos/[...path]">) {
  const user = await getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const parts = (await ctx.params).path;
  if (!parts.at(-1)?.startsWith("compte-") && !user.perms.MEMBRES.voir) return new Response("Accès refusé", { status: 403 });
  const file = await readUpload("membres", parts);
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" } });
}
