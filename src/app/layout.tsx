import type { Metadata, Viewport } from "next";
import { Zilla_Slab } from "next/font/google";
import "./globals.css";

const zilla = Zilla_Slab({ variable: "--font-zilla", subsets: ["latin"], weight: ["600", "700"], display: "swap" });

const SITE_URL = process.env.SITE_URL ?? "https://fogeko.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Fondation Gekoko (FOGEKO) · Kinshasa", template: "%s · FOGEKO" },
  description:
    "La Fondation Gekoko (FOGEKO) est une organisation engagée dans l'éducation des jeunes, la lutte contre la pauvreté et le développement communautaire à Kinshasa.",
  openGraph: {
    type: "website",
    locale: "fr_CD",
    siteName: "Fondation Gekoko",
    images: [{ url: "/img/og-default.jpg", width: 1200, height: 630, alt: "Fondation Gekoko — FOGEKO" }],
  },
};

export const viewport: Viewport = { themeColor: "#0A1360" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={zilla.variable} data-scroll-behavior="smooth">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
