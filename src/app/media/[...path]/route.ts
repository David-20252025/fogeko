import { readUpload } from "@/lib/storage";

// Images de contenu envoyées depuis l'admin (noms aléatoires, jamais modifiées : cache long)
export async function GET(_: Request, ctx: RouteContext<"/media/[...path]">) {
  const file = await readUpload("public", (await ctx.params).path);
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
}
