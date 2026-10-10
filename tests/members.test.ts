import assert from "node:assert/strict";
import { test } from "node:test";
import { formatNumero, normalizePhone } from "../src/lib/members";

test("numéro de membre", () => {
  assert.equal(formatNumero(1), "FOGEKO-0001");
  assert.equal(formatNumero(12345), "FOGEKO-12345");
});
test("téléphones RDC", () => {
  for (const p of ["0812345678", "812345678", "+243 81 234 56 78", "00243812345678", "081-234-5678"]) assert.equal(normalizePhone(p), "+243812345678", p);
  for (const p of ["12345", "+33612345678", "0712345678", ""]) assert.equal(normalizePhone(p), null, p);
});

test("plusieurs numéros de la fondation", async () => {
  const { phoneList } = await import("../src/lib/settings");
  assert.deepEqual(phoneList("+243 898 928 888 / +243 896 370 519"), [
    { label: "+243 898 928 888", href: "tel:+243898928888" },
    { label: "+243 896 370 519", href: "tel:+243896370519" },
  ]);
});
