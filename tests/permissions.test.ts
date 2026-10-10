import assert from "node:assert/strict";
import { test } from "node:test";
import { computePerms, DEFAULT_MATRIX, fromLetters, MODULES } from "../src/lib/permissions";

const role = (module: string, l: string) => ({ module, ...fromLetters(l) }) as never;

test("super admin : tout, partout", () => {
  const p = computePerms(true, []);
  for (const { key } of MODULES) assert.deepEqual(Object.values(p[key]), [true, true, true, true, true], key);
});

test("rôle seul", () => {
  const p = computePerms(false, [role("FINANCES", "VCE")]);
  assert.deepEqual(p.FINANCES, { voir: true, creer: true, modifier: false, supprimer: false, exporter: true });
  assert.equal(p.MEMBRES.voir, false, "module absent du rôle = aucun accès");
});

test("personnalisation du compte prioritaire sur le rôle", () => {
  const p = computePerms(false, [role("MEMBRES", "VCMSE"), role("FINANCES", "V")], [
    { module: "MEMBRES", supprimer: false, exporter: null } as never, // retire la suppression, garde l'export du rôle
    { module: "FINANCES", creer: true } as never, // ajoute la création
  ]);
  assert.deepEqual(p.MEMBRES, { voir: true, creer: true, modifier: true, supprimer: false, exporter: true });
  assert.equal(p.FINANCES.creer, true);
});

test("sans « voir », aucune action n'est possible", () => {
  const p = computePerms(false, [role("ARCHIVES", "CMSE")]);
  assert.deepEqual(Object.values(p.ARCHIVES), [false, false, false, false, false]);
  const q = computePerms(false, [role("MEMBRES", "VCMSE")], [{ module: "MEMBRES", voir: false } as never]);
  assert.equal(q.MEMBRES.modifier, false, "retirer « voir » à un compte coupe tout le module");
});

test("matrice de départ : le trésorier ne voit pas les contenus, la communication pas les finances", () => {
  assert.equal(DEFAULT_MATRIX.Trésorier.ACTUALITES, undefined);
  assert.equal(DEFAULT_MATRIX.Communication.FINANCES, undefined);
  assert.equal(fromLetters(DEFAULT_MATRIX.Lecteur.MEMBRES).modifier, false);
});

test("grille de formulaire → personnalisations minimales", async () => {
  const { parseGrid, overridesFrom } = await import("../src/lib/permissions");
  const f = new FormData();
  for (const k of ["p.MEMBRES.voir", "p.MEMBRES.creer", "p.FINANCES.voir"]) f.set(k, "on");
  const wanted = parseGrid(f);
  assert.equal(wanted.MEMBRES.creer, true);
  assert.equal(wanted.MEMBRES.supprimer, false);
  const roleP = computePerms(false, [role("MEMBRES", "VCMSE")]);
  const ov = overridesFrom(wanted, roleP);
  assert.deepEqual(ov, [
    { module: "MEMBRES", modifier: false, supprimer: false, exporter: false },
    { module: "FINANCES", voir: true },
  ]);
  // appliquer ces personnalisations redonne exactement la grille voulue
  assert.deepEqual(computePerms(false, [role("MEMBRES", "VCMSE")], ov as never), wanted);
});
