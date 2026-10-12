import { test } from "node:test";
import assert from "node:assert/strict";
import { INTEGRATIONS, SCOPE_INFO, defaultScopes, scopeOfTool, scopesOf } from "@/content/integrations";
import { WALLET_CHAINS, familyOf, normAddress } from "@/content/wallets";
import { TOOLS, toolByName } from "./registry";
import { grantScopes, isLive, type Grant } from "./grants";
import { scopeDenied } from "./actions";
import { walletsIn } from "../wallets";

const grant = (connector: string, over: Partial<Grant> = {}): Grant => ({
  id: "g", userId: "u", connector, enabled: true, agentSlugs: ["home"], perTxUsd: 5, dailyUsd: 20, maxSlippageBps: 100,
  scopes: null, expiresAt: null, consentedAt: null, createdAt: new Date(), updatedAt: new Date(), ...over,
});

test("every tool of an addable integration needs a scope that integration can ask for", () => {
  for (const i of INTEGRATIONS.filter((x) => x.addable)) {
    for (const t of TOOLS.filter((x) => x.connector === i.id)) {
      const need = scopeOfTool(t.name, t.risk);
      const ok = need === "transfer" ? scopesOf(i.id).includes("withdraw") || scopesOf(i.id).includes("transfer") : scopesOf(i.id).includes(need);
      assert.ok(ok, `${t.name} needs ${need}, which ${i.id} doesn't offer`);
    }
  }
  for (const id of INTEGRATIONS.map((i) => i.id)) for (const s of scopesOf(id)) assert.ok(SCOPE_INFO[s]);
});

test("defaults: everything except sending to any address", () => {
  assert.deepEqual(defaultScopes("solana"), ["read", "withdraw"]);
  assert.deepEqual(defaultScopes("hyperliquid"), ["read", "trade"]);
  assert.deepEqual(defaultScopes("prices"), ["read"]);
  assert.equal(scopeOfTool("solana.transfer", "sign"), "transfer");
  assert.equal(scopeOfTool("panta.position", "sign"), "bet");
  assert.equal(scopeOfTool("hyperliquid.order", "sign"), "trade");
  assert.equal(scopeOfTool("hyperliquid.price", "read"), "read");
});

test("legacy grants keep every scope; consented ones keep only what was allowed", () => {
  assert.deepEqual(grantScopes(grant("orca")), ["read", "trade"]);
  assert.deepEqual(grantScopes(grant("orca", { scopes: ["read"] })), ["read"]);
  assert.deepEqual(grantScopes(grant("orca", { scopes: ["read", "transfer", "bogus"] })), ["read"], "scopes the integration can't do are dropped");
});

test("expiry: a grant past its time is not live", () => {
  assert.equal(isLive(grant("orca", { expiresAt: new Date(Date.now() + 60_000) })), true);
  assert.equal(isLive(grant("orca", { expiresAt: new Date(Date.now() - 1) })), false);
  assert.equal(isLive(grant("orca", { enabled: false })), false);
  assert.equal(isLive(grant("orca")), true, "no expiry: grants from before consent");
});

test("policy: trades need the trade scope, and nothing runs after expiry", async () => {
  const order = toolByName("hyperliquid.order")!, price = toolByName("hyperliquid.price")!;
  assert.equal(await scopeDenied("u", grant("hyperliquid", { scopes: ["read", "trade"] }), order, {}), null);
  assert.match((await scopeDenied("u", grant("hyperliquid", { scopes: ["read"] }), order, {}))!, /didn't allow Hyperliquid to trade/);
  assert.equal(await scopeDenied("u", grant("hyperliquid", { scopes: ["read"] }), price, null), null);
  assert.match((await scopeDenied("u", grant("hyperliquid", { expiresAt: new Date(Date.now() - 1000) }), price, null))!, /expired/);
});

test("linked wallets come from Privy's linked accounts: Solana and EVM, normalised, deduplicated", () => {
  const sol = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", evm = "0xAbCdEf0123456789abcdef0123456789ABCDEF01";
  const out = walletsIn([
    { type: "wallet", chain_type: "solana", address: sol, wallet_client_type: "phantom" },
    { type: "wallet", chain_type: "ethereum", address: evm, wallet_client_type: "metamask" },
    { type: "wallet", chain_type: "ethereum", address: evm.toLowerCase(), wallet_client_type: "metamask" },
    { type: "wallet", chain_type: "solana", address: evm },
    { type: "twitter_oauth", subject: "1" },
    null,
  ]);
  assert.deepEqual(out, [{ address: sol, family: "solana", client: "phantom" }, { address: evm.toLowerCase(), family: "evm", client: "metamask" }]);
  assert.equal(familyOf(sol), "solana");
  assert.equal(normAddress(evm), evm.toLowerCase());
  assert.ok(WALLET_CHAINS.some((c) => c.family === "solana") && WALLET_CHAINS.some((c) => c.family === "evm"));
});
