import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Gestion", template: "%s · FOGEKO" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function GestionRoot({ children }: LayoutProps<"/gestion">) {
  return <div className="min-h-screen bg-mist">{children}</div>;
}
