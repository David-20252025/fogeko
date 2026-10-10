"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/admin/admin-form";
import { ADMINS, assertRole, EDITORS } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { removeContentImage, saveContentImage } from "@/lib/storage";
import { videoEmbed } from "@/lib/video";

const ADMIN = ADMINS;
const s = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => Math.max(0, Math.min(1_000_000, Math.round(Number(f.get(k)) || 0)));
const bool = (f: FormData, k: string) => f.get(k) === "on";

/** Nouvelle image si un fichier est envoyé, sinon l'actuelle. Lève une Error au message lisible. */
async function image(f: FormData, current?: string | null) {
  const file = f.get("image");
  return file instanceof File && file.size > 0 ? saveContentImage(file) : (current ?? null);
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  let slug = slugify(base);
  for (let i = 2; await exists(slug); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

const fail = (e: unknown): FormState => ({ error: e instanceof Error ? e.message : "Erreur inattendue." });

/* ───── Actualités ───── */

export async function saveArticle(id: number | null, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const titre = s(f, "titre", 200), extrait = s(f, "extrait", 400), contenu = s(f, "contenu", 20_000);
  const categorieId = Number(f.get("categorieId"));
  const publieLe = new Date(s(f, "publieLe") || Date.now());
  if (titre.length < 3) return { error: "Le titre est obligatoire." };
  if (!(await db.newsCategory.findUnique({ where: { id: categorieId } }))) return { error: "Choisissez une catégorie." };
  if (extrait.length < 10) return { error: "Le résumé est trop court." };
  if (Number.isNaN(publieLe.getTime())) return { error: "Date invalide." };
  const old = id ? await db.article.findUniqueOrThrow({ where: { id } }) : null;
  let img: string | null;
  try { img = await image(f, old?.image); } catch (e) { return fail(e); }
  if (!img) return { error: "Une image est obligatoire." };
  const data = { titre, extrait, contenu: contenu || extrait, categorieId, publieLe, publie: bool(f, "publie"), image: img };
  if (old) {
    await db.article.update({ where: { id: old.id }, data });
    if (old.image !== img) await removeContentImage(old.image);
  } else {
    const slug = await uniqueSlug(titre, async (sl) => !!(await db.article.findUnique({ where: { slug: sl } })));
    await db.article.create({ data: { ...data, slug } });
  }
  redirect("/gestion/actualites");
}

export async function deleteArticle(id: number) {
  await assertRole(ADMIN);
  const a = await db.article.delete({ where: { id } });
  await removeContentImage(a.image);
  redirect("/gestion/actualites");
}

export async function addCategory(_: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const nom = s(f, "nom", 60);
  if (nom.length < 2) return { error: "Nom trop court." };
  if (await db.newsCategory.findFirst({ where: { OR: [{ nom }, { slug: slugify(nom) }] } })) return { error: "Cette catégorie existe déjà." };
  await db.newsCategory.create({ data: { nom, slug: slugify(nom), visible: bool(f, "visible") } });
  revalidatePath("/gestion/actualites");
  return { ok: true };
}

export async function toggleCategory(id: number) {
  await assertRole(EDITORS);
  const c = await db.newsCategory.findUniqueOrThrow({ where: { id } });
  await db.newsCategory.update({ where: { id }, data: { visible: !c.visible } });
  revalidatePath("/gestion/actualites");
}

export async function deleteCategory(id: number) {
  await assertRole(ADMIN);
  if (await db.article.count({ where: { categorieId: id } })) throw new Error("Catégorie non vide");
  await db.newsCategory.delete({ where: { id } });
  revalidatePath("/gestion/actualites");
}

/* ───── Galerie ───── */

export async function addGalleryItem(_: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const titre = s(f, "titre", 160), videoUrl = s(f, "videoUrl", 500);
  if (titre.length < 2) return { error: "Donnez un titre (il sert aussi de description pour l'accessibilité)." };
  if (videoUrl) {
    if (!videoEmbed(videoUrl)) return { error: "Lien vidéo non reconnu : collez un lien YouTube ou Facebook." };
    await db.galleryItem.create({ data: { type: "VIDEO", titre, videoUrl, ordre: int(f, "ordre") } });
  } else {
    let img: string | null;
    try { img = await image(f); } catch (e) { return fail(e); }
    if (!img) return { error: "Choisissez une photo ou collez un lien vidéo." };
    await db.galleryItem.create({ data: { type: "PHOTO", titre, image: img, ordre: int(f, "ordre") } });
  }
  revalidatePath("/gestion/galerie");
  return { ok: true };
}

export async function updateGalleryItem(id: number, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const titre = s(f, "titre", 160);
  if (titre.length < 2) return { error: "Titre trop court." };
  await db.galleryItem.update({ where: { id }, data: { titre, ordre: int(f, "ordre") } });
  revalidatePath("/gestion/galerie");
  return { ok: true };
}

export async function deleteGalleryItem(id: number) {
  await assertRole(ADMIN);
  const g = await db.galleryItem.delete({ where: { id } });
  await removeContentImage(g.image);
  revalidatePath("/gestion/galerie");
}

/* ───── Actions de terrain ───── */

export async function saveAction(id: number | null, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const titre = s(f, "titre", 160), resume = s(f, "resume", 500), contenu = s(f, "contenu", 10_000);
  if (titre.length < 3) return { error: "Le titre est obligatoire." };
  if (resume.length < 10) return { error: "Le résumé est trop court." };
  const old = id ? await db.action.findUniqueOrThrow({ where: { id } }) : null;
  let img: string | null;
  try { img = await image(f, old?.image); } catch (e) { return fail(e); }
  if (!img) return { error: "Une image est obligatoire." };
  const data = { titre, resume, contenu: contenu || resume, image: img, ordre: int(f, "ordre"), publiee: bool(f, "publiee") };
  if (old) {
    await db.action.update({ where: { id: old.id }, data });
    if (old.image !== img) await removeContentImage(old.image);
  } else {
    const slug = await uniqueSlug(titre, async (sl) => !!(await db.action.findUnique({ where: { slug: sl } })));
    await db.action.create({ data: { ...data, slug } });
  }
  redirect("/gestion/actions");
}

export async function deleteAction(id: number) {
  await assertRole(ADMIN);
  const a = await db.action.delete({ where: { id } });
  await removeContentImage(a.image);
  redirect("/gestion/actions");
}

/* ───── Textes du site et frise ───── */

export async function saveSettings(_: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const req = ["heroTitre", "heroSousTitre", "mission", "vision", "valeurs", "fondateurBio", "telephone", "email", "adresse"] as const;
  const data = Object.fromEntries(req.map((k) => [k, s(f, k, 3000)])) as Record<(typeof req)[number], string>;
  const missing = req.find((k) => !data[k]);
  if (missing) return { error: "Tous les champs principaux sont obligatoires." };
  const whatsapp = s(f, "whatsapp", 20).replace(/\D/g, "");
  if (whatsapp.length < 9) return { error: "Numéro WhatsApp invalide (format international, ex. 243812345678)." };
  const url = (k: string) => {
    const v = s(f, k, 300);
    return v && /^https:\/\//.test(v) ? v : null;
  };
  await db.siteSettings.update({
    where: { id: 1 },
    data: {
      ...data, whatsapp,
      statMembres: int(f, "statMembres"), statCommunes: int(f, "statCommunes"), statActions: int(f, "statActions"),
      facebook: url("facebook"), youtube: url("youtube"), tiktok: url("tiktok"), instagram: url("instagram"),
    },
  });
  revalidatePath("/gestion/site");
  return { ok: true };
}

export async function saveTimeline(id: number | null, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const data = { annee: s(f, "annee", 40), titre: s(f, "titre", 160), texte: s(f, "texte", 1000), ordre: int(f, "ordre") };
  if (!data.titre) return { error: "Le titre est obligatoire." };
  if (id) await db.timelineEvent.update({ where: { id }, data });
  else await db.timelineEvent.create({ data });
  revalidatePath("/gestion/site");
  return { ok: true };
}

export async function deleteTimeline(id: number) {
  await assertRole(ADMIN);
  await db.timelineEvent.delete({ where: { id } });
  revalidatePath("/gestion/site");
}

/* ───── Messages de contact ───── */

export async function toggleRead(id: number) {
  await assertRole(EDITORS);
  const m = await db.contactMessage.findUniqueOrThrow({ where: { id } });
  await db.contactMessage.update({ where: { id }, data: { lu: !m.lu } });
  revalidatePath("/gestion", "layout");
}

export async function deleteMessage(id: number) {
  await assertRole(ADMIN);
  await db.contactMessage.delete({ where: { id } });
  revalidatePath("/gestion", "layout");
}

/* ───── Membres de l'administration ───── */

export async function saveDirigeant(id: number | null, _: FormState, f: FormData): Promise<FormState> {
  await assertRole(EDITORS);
  const nom = s(f, "nom", 80), prenom = s(f, "prenom", 80), postNom = s(f, "postNom", 80), poste = s(f, "poste", 120);
  if (nom.length < 2 || prenom.length < 2) return { error: "Le nom et le prénom sont obligatoires." };
  if (poste.length < 2) return { error: "Indiquez le poste occupé." };
  const old = id ? await db.dirigeant.findUniqueOrThrow({ where: { id } }) : null;
  let photo: string | null;
  try { photo = await image(f, old?.photo); } catch (e) { return fail(e); }
  if (!photo) return { error: "Une photo est obligatoire." };
  const data = { nom, prenom, postNom: postNom || null, poste, photo, ordre: int(f, "ordre"), publie: bool(f, "publie") };
  if (old) {
    await db.dirigeant.update({ where: { id: old.id }, data });
    if (old.photo !== photo) await removeContentImage(old.photo);
  } else {
    await db.dirigeant.create({ data });
  }
  redirect("/gestion/administration");
}

export async function deleteDirigeant(id: number) {
  await assertRole(ADMIN);
  const d = await db.dirigeant.delete({ where: { id } });
  await removeContentImage(d.photo);
  redirect("/gestion/administration");
}
