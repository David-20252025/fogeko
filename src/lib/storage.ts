import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ARCHIVE_MAX, cleanName, detectType } from "./archive-file";

// Dossier hors de /public : les photos des membres ne sont servies qu'après connexion (volume persistant Dokploy)
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "uploads");

/** Vérifie que c'est une vraie image (décodage), puis écrit la photo 400×400 et la miniature 96×96 en WebP. */
export async function saveMemberPhoto(buf: Buffer, id: string) {
  const meta = await sharp(buf, { limitInputPixels: 40_000_000 }).metadata(); // lève une erreur si ce n'est pas une image
  if (!["jpeg", "png", "webp", "heif"].includes(meta.format ?? "")) throw new Error("format");
  const dir = path.join(UPLOAD_DIR, "membres");
  await mkdir(dir, { recursive: true });
  const base = sharp(buf).rotate(); // respecte l'orientation des photos de téléphone
  const photo = `membres/${id}.webp`;
  const photoThumb = `membres/${id}-mini.webp`;
  await writeFile(path.join(UPLOAD_DIR, photo), await base.clone().resize(400, 400, { fit: "cover" }).webp({ quality: 80 }).toBuffer());
  await writeFile(path.join(UPLOAD_DIR, photoThumb), await base.clone().resize(96, 96, { fit: "cover" }).webp({ quality: 70 }).toBuffer());
  return { photo, photoThumb };
}

export async function removeFiles(...rel: string[]) {
  await Promise.all(rel.map((r) => unlink(path.join(UPLOAD_DIR, r)).catch(() => {})));
}

/** Image de contenu (actualité, galerie, action) : vérifiée, max 1600 px, WebP. Renvoie l'URL publique /media/… */
export async function saveContentImage(file: File) {
  if (file.size > 12 * 1024 * 1024) throw new Error("Image trop lourde (12 Mo maximum).");
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const meta = await sharp(buf, { limitInputPixels: 60_000_000 }).metadata();
    if (!["jpeg", "png", "webp", "heif", "gif"].includes(meta.format ?? "")) throw new Error();
  } catch {
    throw new Error("Le fichier n'est pas une image valide (JPG, PNG ou WebP).");
  }
  const dir = path.join(UPLOAD_DIR, "public");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.webp`;
  await writeFile(path.join(dir, name), await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer());
  return `/media/${name}`;
}

/** Supprime une image de contenu envoyée (les images d'origine dans /img ne sont jamais touchées). */
export async function removeContentImage(url?: string | null) {
  if (url?.startsWith("/media/")) await removeFiles(`public/${path.basename(url)}`);
}

/** Lit un fichier sous UPLOAD_DIR/<sousDossier> en refusant toute sortie du dossier (../). */
export async function readUpload(sub: "public" | "membres", parts: string[]) {
  const base = path.join(UPLOAD_DIR, sub);
  const full = path.resolve(base, ...parts);
  if (!full.startsWith(base + path.sep) || !full.endsWith(".webp")) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

/** Enregistre un fichier d'archive (PDF ou photo) après contrôle du vrai type ; renvoie les infos à stocker en base. */
export async function saveArchiveFile(file: File) {
  if (file.size === 0) throw new Error("Fichier vide.");
  if (file.size > ARCHIVE_MAX) throw new Error(`« ${file.name} » dépasse 10 Mo.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = detectType(buf);
  if (!type) throw new Error(`« ${file.name} » n'est ni un PDF ni une image JPG, PNG ou WEBP.`);
  const dir = path.join(UPLOAD_DIR, "archives");
  await mkdir(dir, { recursive: true });
  const fichier = `${randomUUID()}.${type.ext}`; // nom aléatoire sur le disque, nom d'origine nettoyé en base
  await writeFile(path.join(dir, fichier), buf);
  return { fichier, mime: type.mime, taille: file.size, nomOriginal: cleanName(file.name, type.ext) };
}

/** Lit un fichier d'archive (nom généré par saveArchiveFile, sans sortie possible du dossier). */
export async function readArchiveFile(fichier: string) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/.test(fichier)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, "archives", fichier));
  } catch {
    return null;
  }
}
