import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanName, detectType } from "../src/lib/archive-file";

const bytes = (...b: (number | string)[]) => {
  const out: number[] = [];
  for (const x of b) {
    if (typeof x === "string") out.push(...[...x].map((c) => c.charCodeAt(0)));
    else out.push(x);
  }
  while (out.length < 16) out.push(0);
  return new Uint8Array(out);
};

test("vrai type de fichier d'après le contenu", () => {
  assert.equal(detectType(bytes("%PDF-1.7"))?.mime, "application/pdf");
  assert.equal(detectType(bytes(0xff, 0xd8, 0xff, 0xe0))?.ext, "jpg");
  assert.equal(detectType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))?.ext, "png");
  assert.equal(detectType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))?.ext, "webp");
});

test("fichiers refusés même avec une extension trompeuse", () => {
  assert.equal(detectType(bytes("MZ")), null, "exécutable Windows renommé en .pdf");
  assert.equal(detectType(bytes("<html><script>")), null, "page HTML");
  assert.equal(detectType(bytes("PK", 3, 4)), null, "archive ZIP / document Office");
  assert.equal(detectType(new Uint8Array([0x25, 0x50])), null, "fichier tronqué");
});

test("noms de fichiers nettoyés", () => {
  assert.equal(cleanName("../../etc/passwd.pdf", "pdf"), "passwd.pdf");
  assert.equal(cleanName("C:\\Users\\x\\Reçu  juin<2026>.PNG", "png"), "Reçu juin2026.png");
  assert.equal(cleanName("facture.exe", "pdf"), "facture.pdf", "l'extension vient du vrai type");
  assert.equal(cleanName("...", "jpg"), "document.jpg");
});
