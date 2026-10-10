import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Utilisée par Dokploy pour vérifier que l'application et la base répondent
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "erreur", db: false }, { status: 503 });
  }
}
