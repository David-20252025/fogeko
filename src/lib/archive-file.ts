// Contrôles purs des fichiers d'archive (testés) : vrai type d'après le contenu, nom nettoyé
// 4 Mo : Vercel refuse les requêtes de plus de 4,5 Mo (photos, archives, justificatifs)
export const ARCHIVE_MAX = 4 * 1024 * 1024;

export const CATEGORIES_ARCHIVE = {
  ADMINISTRATIF: "Administratif", FINANCIER: "Financier", JURIDIQUE: "Juridique", EVENEMENT: "Événement", AUTRE: "Autre",
} as const;

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d }, // %PDF-
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x) },
  { mime: "image/webp", ext: "webp", test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
];

/** Type réel du fichier d'après ses premiers octets (l'extension et le type annoncé par le navigateur sont ignorés). */
export function detectType(bytes: Uint8Array): { mime: string; ext: string } | null {
  const s = SIGNATURES.find((x) => bytes.length >= 12 && x.test(bytes));
  return s ? { mime: s.mime, ext: s.ext } : null;
}

/** Nom de fichier affichable et sûr : sans chemin, sans caractères de contrôle ni séparateurs, 120 caractères max. */
export function cleanName(name: string, ext: string) {
  const base = name.split(/[\\/]/).pop()!.replace(/\.[^.]*$/, "")
    .normalize("NFC").replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").replace(/\s+/g, " ").replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 100) || "document";
  return `${base}.${ext}`;
}
