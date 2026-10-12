import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const pairs = (src: string, re: RegExp) => [...src.matchAll(re)].map((m) => m.slice(1).join(" | "));

test("ORE bot gift: the phone shows the same honest facts as the web", () => {
  const re = /title: "([^"]+)", body: "([^"]+)"/g;
  const web = pairs(read("../../webapp/components/miner/OreGift.tsx"), re);
  const phone = pairs(read("../src/web/OreGift.tsx"), re);
  assert.equal(web.length, 3);
  assert.deepEqual(phone, web);
  for (const line of [...web, ...phone]) assert.ok(!line.includes("\u2014"), "no em dashes in UI copy");
  assert.match(web.join(" "), /devnet/);
  assert.match(web.join(" "), /remove/i);
});

test("open models: the phone picker lists the same ids, names and makers as the web", () => {
  const re = /id: "(kimi|qwen|zg)", label: "([^"]+)",(?: short: "[^"]+",)? maker: "([^"]+)"/g;
  const web = pairs(read("../../webapp/content/models.ts"), re);
  const phone = pairs(read("../src/web/ModelSheet.tsx"), re);
  assert.equal(web.length, 3);
  assert.deepEqual(phone, web);
});
