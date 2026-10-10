import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion" };

// Déjà connecté : inutile de revoir le formulaire, direction le tableau de bord
export default async function AuthLayout({ children }: LayoutProps<"/gestion">) {
  if (await getUser()) redirect("/gestion");
  return children;
}
