import { test } from "node:test";
import assert from "node:assert/strict";
import { toolByName } from "./registry";
import { integrationById } from "@/content/integrations";

test("monad tools are reads on their own connectors", () => {
  for (const [n, c] of [["monad.wallet", "monad"], ["nansen.wallet", "nansen"], ["kuru.quote", "kuru"]]) {
    const t = toolByName(n);
    assert.ok(t, n); assert.equal(t!.risk, "read"); assert.equal(t!.connector, c);
    assert.ok(integrationById(c), c);
  }
});
test("nansen and kuru refuse plainly without keys", async () => {
  delete process.env.NANSEN_API_KEY; delete process.env.KURU_API_URL;
  const agent = { slug: "a", kind: "k", name: "A", userId: "u", keypair: () => { throw new Error("no"); } } as never;
  await assert.rejects(toolByName("nansen.wallet")!.run!({ address: "0x0000000000000000000000000000000000000001", chain: "ethereum" } as never, agent), /not set up/);
  await assert.rejects(toolByName("kuru.quote")!.run!({ sell: "MON", buy: "USDC", amount: 1 } as never, agent), /not set up/);
});

test("kuru.swap is a confirm-card sign tool, never auto", () => {
  const t = toolByName("kuru.swap")!;
  assert.equal(t.risk, "sign"); assert.ok(!t.auto); assert.ok(t.prepare && t.execute);
});

test("card.pay is a Tempo confirm-card sign tool, never auto", () => {
  const t = toolByName("card.pay")!;
  assert.equal(t.connector, "tempo"); assert.equal(t.risk, "sign"); assert.ok(!t.auto); assert.ok(t.prepare && t.execute);
});

test("metamask.send is a confirm-card sign tool on its own connector", () => {
  const t = toolByName("metamask.send")!;
  assert.equal(t.connector, "metamask"); assert.equal(t.risk, "sign"); assert.ok(!t.auto);
  assert.ok(integrationById("metamask"));
});
