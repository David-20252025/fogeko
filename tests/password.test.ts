import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("hachage des mots de passe", async () => {
  const h = await hashPassword("un-bon-mot-de-passe");
  assert.notEqual(h, await hashPassword("un-bon-mot-de-passe")); // sel aléatoire
  assert.equal(await verifyPassword("un-bon-mot-de-passe", h), true);
  assert.equal(await verifyPassword("mauvais", h), false);
  assert.equal(await verifyPassword("x", "n'importe quoi"), false);
});
