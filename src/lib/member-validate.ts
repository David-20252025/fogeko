import type { Categorie, Sexe } from "@/generated/prisma/client";
import { db } from "./db";
import { CATEGORIES, normalizePhone, type CategorieKey } from "./members";

const str = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);

export type MemberFields = {
  nom: string; postNom: string | null; prenom: string; sexe: Sexe; dateNaissance: Date | null;
  telephone: string; email: string | null; communeId: number; quartier: string; profession: string | null;
  categorie: Categorie; egliseMinistere: string | null;
};

/** Validation commune à l'adhésion publique et à la modification dans l'espace de gestion. */
export async function parseMemberFields(f: FormData): Promise<{ data: MemberFields } | { error: string }> {
  const nom = str(f, "nom"), prenom = str(f, "prenom"), sexe = str(f, "sexe");
  const telephone = normalizePhone(str(f, "telephone", 30));
  const email = str(f, "email", 160);
  const communeId = Number(str(f, "communeId"));
  const quartier = str(f, "quartier");
  const categorie = str(f, "categorie") as CategorieKey;
  const egliseMinistere = str(f, "egliseMinistere", 160);
  const dateNaissance = str(f, "dateNaissance", 10);

  if (nom.length < 2 || prenom.length < 2) return { error: "Le nom et le prénom sont obligatoires." };
  if (sexe !== "F" && sexe !== "M") return { error: "Merci d'indiquer le sexe." };
  if (!telephone) return { error: "Numéro de téléphone invalide. Exemple : 0812345678." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "L'adresse email semble incorrecte." };
  if (!Number.isInteger(communeId) || !(await db.commune.findUnique({ where: { id: communeId } }))) return { error: "Merci de choisir la commune." };
  if (quartier.length < 2) return { error: "Merci d'indiquer le quartier." };
  if (!(categorie in CATEGORIES)) return { error: "Merci de choisir une catégorie." };
  if (categorie === "PASTEUR" && egliseMinistere.length < 2) return { error: "Merci d'indiquer l'église ou le ministère." };
  let naissance: Date | null = null;
  if (dateNaissance) {
    naissance = new Date(`${dateNaissance}T00:00:00Z`);
    const age = (Date.now() - naissance.getTime()) / 31_557_600_000;
    if (Number.isNaN(age) || age < 10 || age > 110) return { error: "La date de naissance semble incorrecte." };
  }
  return {
    data: {
      nom, prenom, sexe, telephone, communeId, quartier, categorie,
      postNom: str(f, "postNom") || null,
      email: email || null,
      profession: str(f, "profession") || null,
      egliseMinistere: categorie === "PASTEUR" ? egliseMinistere : null,
      dateNaissance: naissance,
    },
  };
}
