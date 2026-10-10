import assert from "node:assert/strict";
import { test } from "node:test";
import { assignableRoles, canManage } from "../src/lib/roles";

test("hiérarchie des rôles", () => {
  assert.ok(assignableRoles("SUPERADMIN").includes("SUPERADMIN"));
  assert.ok(!assignableRoles("ADMIN").includes("SUPERADMIN"), "un admin ne crée pas de super admin");
  assert.deepEqual(assignableRoles("SECRETAIRE"), []);
  assert.equal(canManage("ADMIN", "SUPERADMIN"), false);
  assert.equal(canManage("ADMIN", "SECRETAIRE"), true);
  assert.equal(canManage("SUPERADMIN", "SUPERADMIN"), true);
  assert.equal(canManage("LECTEUR", "LECTEUR"), false);
});
