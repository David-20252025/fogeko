import { headers } from "next/headers";

// Derrière Traefik (Dokploy), l'IP du visiteur arrive dans X-Real-Ip / X-Forwarded-For
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "inconnue";
}
