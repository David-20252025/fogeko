import assert from "node:assert/strict";
import { test } from "node:test";
import { filtersToQuery, parseFilters } from "../src/lib/member-query";

test("filtres lus depuis l'URL", () => {
  const f = parseFilters({ q: "  Grâce ", categorie: "MAMAN", statut: "PIRATE", communeId: "abc", quartier: "" });
  assert.deepEqual(f, { q: "Grâce", categorie: "MAMAN", statut: undefined, communeId: undefined, quartier: undefined });
  assert.equal(filtersToQuery(f), "q=Gr%C3%A2ce&categorie=MAMAN");
  assert.equal(parseFilters({ communeId: "12" }).communeId, 12);
});
