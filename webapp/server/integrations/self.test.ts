import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName } from "./self";
import { TOOLS, toolByName } from "./registry";
import { integrationById } from "@/content/integrations";

test("names: trimmed, 40 characters, no links or markup", () => {
  assert.equal(cleanName("  Nova   Prime "), "Nova Prime");
  assert.equal(cleanName("Ada-Lovelace"), "Ada-Lovelace");
  assert.equal(cleanName("Zoë"), "Zoë");
  for (const bad of ["", " ", "x".repeat(41), "see https://evil.example", "<b>hi</b>", "me@x.com", "-dash"]) assert.throws(() => cleanName(bad));
});

test("self tools: Confirm-card only, built in for every agent, and nothing touches grants, limits or wallets", () => {
  const self = TOOLS.filter((t) => t.connector === "self");
  assert.deepEqual(self.map((t) => t.name).sort(), ["self.rename", "self.setavatar", "self.setmodel", "self.setpersona"]);
  for (const t of self) { assert.equal(t.risk, "sign"); assert.equal(t.offchain, true); assert.ok(!t.auto); }
  assert.equal(integrationById("self")?.builtin, "all");
  assert.equal(integrationById("self")?.addable, false);
  assert.ok(toolByName("self.setAvatar"), "tags are case-insensitive");
  assert.ok(!TOOLS.some((t) => /^self\.(grant|limit|wallet|key|budget)/.test(t.name)));
});
