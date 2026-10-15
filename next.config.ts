import type { NextConfig } from "next";

// N'autorise que nos propres ressources + les 3 services intégrés (vidéos YouTube/Facebook, carte OpenStreetMap).
// 'unsafe-inline' reste nécessaire pour les scripts d'hydratation de Next.js sans nonce.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://tile.openstreetmap.org", // tuiles de la carte du tableau de bord
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com https://www.facebook.com https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone", // image Docker légère pour Dokploy
  poweredByHeader: false, // ne pas annoncer la technologie du serveur (X-Powered-By)
  // Les photos des membres et les sources ne doivent jamais être copiées dans le build
  outputFileTracingExcludes: { "*": ["uploads/**", "src/**", ".pgdata/**", "apercus/**"] },
  // Polices du rapport PDF, lues sur le disque par pdfmake (non détectées automatiquement)
  outputFileTracingIncludes: { "/gestion/**": ["./node_modules/pdfmake/fonts/Roboto/*.ttf"] },
  // Photos envoyées depuis l'admin (12 Mo max, vérifié côté serveur) ; l'adhésion publique reste limitée à 900 Ko dans son action
  experimental: { serverActions: { bodySizeLimit: "13mb" }, authInterrupts: true }, // authInterrupts : forbidden() → page 403
  // Images optimisées gardées 30 jours (les photos envoyées ont des noms uniques : jamais de version périmée)
  images: { qualities: [60, 75], minimumCacheTTL: 2_592_000 },
  async headers() {
    return [
      // Logo et photos du site : 7 jours en cache navigateur (au lieu de les revalider à chaque visite)
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // En développement, Next.js a besoin d'eval : la politique ne s'applique qu'en production
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
