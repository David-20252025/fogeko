import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "../src/lib/slug";

test("slugs", () => {
  assert.equal(slugify("Cérémonie d'accueil à Kingabwa !"), "ceremonie-d-accueil-a-kingabwa");
  assert.equal(slugify("   "), "article");
});
