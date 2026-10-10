// Usage : node scripts/prep-images.mjs <dossier_source>  — convertit les photos fournies en WebP
import sharp from "sharp";
import { join } from "node:path";
const src = process.argv[2];
const out = "public/img";
const photos = { "2.jpg": "fondateur-hommage", "3.jpg": "fondateur-sceptre", "4.jpg": "fondateur-assis", "5.jpg": "fondateur-peau", "6.jpg": "fondateur-portrait" };
for (const [f, name] of Object.entries(photos)) {
  await sharp(join(src, f)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(out, `${name}.webp`));
  await sharp(join(src, f)).resize({ width: 640 }).webp({ quality: 72 }).toFile(join(out, `${name}-sm.webp`));
}
// Logo : fond blanc -> transparent (seuil sur la luminosité)
const { data, info } = await sharp(join(src, "1.jpg")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const m = Math.min(data[i], data[i + 1], data[i + 2]);
  if (m > 235) data[i + 3] = 0; else if (m > 200) data[i + 3] = Math.round(((235 - m) / 35) * 255);
}
const logo = sharp(data, { raw: info }).trim();
await logo.clone().resize({ width: 600 }).png().toFile(join(out, "logo.png"));
await logo.clone().resize({ width: 600 }).webp({ quality: 90 }).toFile(join(out, "logo.webp"));
await sharp(join(src, "1.jpg")).resize(1200, 630, { fit: "contain", background: "#ffffff" }).jpeg({ quality: 85 }).toFile(join(out, "og-default.jpg"));
console.log("ok");
// Colombe seule (pour le filigrane / l'animation)
{
  const { data, info } = await sharp(join(src, "1.jpg")).extract({ left: 370, top: 270, width: 300, height: 310 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.min(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = m > 200 ? 0 : 255 - Math.max(0, m - 120) * 3;
  }
  await sharp(data, { raw: info }).trim().png().toFile(join(out, "colombe.png"));
}
// Icônes d'onglet / écran d'accueil à partir du logo (carré, centré)
await sharp(join(out, "logo.png")).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile("src/app/icon.png");
await sharp(join(out, "logo.png")).resize(160, 160, { fit: "contain", background: "#ffffff" }).extend({ top: 10, bottom: 10, left: 10, right: 10, background: "#ffffff" }).png().toFile("src/app/apple-icon.png");
