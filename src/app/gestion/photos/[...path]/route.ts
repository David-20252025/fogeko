import { getUser } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

// Photos des membres : uniquement pour l'équipe connectée, jamais mises en cache partagé
export async function GET(_: Request, ctx: RouteContext<"/gestion/photos/[...path]">) {
  if (!(await getUser())) return new Response("Non autorisé", { status: 401 });
  const file = await readUpload("membres", (await ctx.params).path);
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" } });
}
