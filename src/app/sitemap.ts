import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "https://fogeko.com";
  const pages = ["", "/a-propos", "/administration", "/actions", "/actualites", "/galerie", "/adhesion", "/contact", "/confidentialite"];
  const articles = await db.article.findMany({
    where: { publie: true, publieLe: { lte: new Date() }, categorie: { visible: true } },
    select: { slug: true, publieLe: true },
  });
  return [
    ...pages.map((p) => ({ url: `${base}${p}` })),
    ...articles.map((a) => ({ url: `${base}/actualites/${a.slug}`, lastModified: a.publieLe })),
  ];
}
