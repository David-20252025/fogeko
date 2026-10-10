import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit } from "../src/lib/rate-limit";

test("limite par fenêtre glissante", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit("k", 3, 60_000, { now: t0 + i }), true);
  assert.equal(rateLimit("k", 3, 60_000, { now: t0 + 10 }), false, "4e essai refusé");
  assert.equal(rateLimit("autre", 3, 60_000, { now: t0 + 10 }), true, "clés indépendantes");
  assert.equal(rateLimit("k", 3, 60_000, { now: t0 + 60_005 }), true, "à nouveau autorisé après la fenêtre");
  assert.equal(rateLimit("v", 1, 60_000, { now: t0, record: false }), true, "simple vérification");
  assert.equal(rateLimit("v", 1, 60_000, { now: t0, record: false }), true, "…qui ne consomme rien");
});
