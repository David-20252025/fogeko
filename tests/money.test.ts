import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMontant, moisCle, moisDebut, parseMontant } from "../src/lib/money";

test("montants saisis", () => {
  assert.equal(parseMontant("1 500,50"), "1500.50");
  assert.equal(parseMontant("1500.5"), "1500.50");
  assert.equal(parseMontant("2 000"), "2000.00");
  assert.equal(parseMontant("0007"), "7.00");
  for (const bad of ["", "0", "0,00", "-5", "12,345", "1e5", "abc", "1.500,00", "9999999999999"]) assert.equal(parseMontant(bad), null, bad);
});
test("affichage et mois", () => {
  assert.match(formatMontant("1500.5", "USD"), /1\s?500,50\s?\$US|1\s?500,50/);
  assert.equal(moisCle(moisDebut("2026-10")!), "2026-10");
  assert.equal(moisDebut("2026-13"), null);
});
