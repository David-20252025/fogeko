import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

// Stockage sur disque, dans un dossier temporaire
process.env.UPLOAD_DIR = mkdtempSync(path.join(tmpdir(), "fogeko-"));

test("archive : enregistrée, relue à l'identique, puis supprimée", async () => {
  const { readArchiveFile, removeFiles, saveArchiveFile } = await import("../src/lib/storage");
  const pdf = new File([Buffer.from("%PDF-1.7\n" + "x".repeat(100))], "Reçu juin.pdf");
  const info = await saveArchiveFile(pdf);
  assert.equal(info.mime, "application/pdf");
  assert.equal(info.nomOriginal, "Reçu juin.pdf");
  assert.deepEqual(await readArchiveFile(info.fichier), Buffer.from(await pdf.arrayBuffer()));
  await removeFiles(`archives/${info.fichier}`);
  assert.equal(await readArchiveFile(info.fichier), null);
});

test("fichiers trop lourds ou hors du dossier refusés", async () => {
  const { readArchiveFile, readUpload, saveArchiveFile } = await import("../src/lib/storage");
  const { ARCHIVE_MAX } = await import("../src/lib/archive-file");
  await assert.rejects(saveArchiveFile(new File([new Uint8Array(ARCHIVE_MAX + 1)], "gros.pdf")), /dépasse 10 Mo/);
  assert.equal(await readUpload("membres", ["..", "..", "secret.webp"]), null);
  assert.equal(await readArchiveFile("../../.env"), null);
});
