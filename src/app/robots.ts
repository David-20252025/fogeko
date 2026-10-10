import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "https://fogeko.com";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/gestion", "/api"] }, sitemap: `${base}/sitemap.xml` };
}
