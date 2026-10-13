import { test } from "node:test";
import assert from "node:assert/strict";
import { evmChainOf, EVM } from "./evm";
import { isZcashT, zcashAddressOfKey } from "./zcash";
import { scopeOfTool, scopesOf, integrationById } from "@/content/integrations";
import { toolByName } from "./registry";

test("zcash transparent address of private key 1", () => {
  const k = new Uint8Array(32); k[31] = 1;
  const a = zcashAddressOfKey(k);
  assert.equal(a, "t1UYsZVJkLPeMjxEtACvSxfWuNmddpWfxzs");
  assert.ok(isZcashT(a));
  assert.ok(!isZcashT(`${a.slice(0, -1)}x`));
});

test("evm chain aliases and table", () => {
  assert.equal(evmChainOf("Arbitrum Sepolia"), "arbitrum");
  assert.equal(evmChainOf("robinhood chain"), "robinhood");
  assert.equal(evmChainOf("solana"), null);
  assert.equal(EVM.robinhood.chainId, 46630);
  assert.equal(EVM.arbitrum.chainId, 421614);
});

test("every new tool is registered with a catalog entry and the right scope", () => {
  for (const n of ["base.transfer", "ethereum.transfer", "arbitrum.wallet", "arbitrum.transfer", "robinhood.wallet", "robinhood.transfer", "monad.transfer", "uniswap.quote", "uniswap.swap", "polymarket.market", "polymarket.order", "zcash.wallet", "zcash.quote", "zcash.buy"]) {
    const t = toolByName(n);
    assert.ok(t, n);
    assert.ok(integrationById(t!.connector), n);
    assert.ok(scopesOf(t!.connector).includes(scopeOfTool(t!.name, t!.risk)), n);
  }
  assert.equal(scopeOfTool("polymarket.order", "sign"), "bet");
  assert.equal(scopeOfTool("uniswap.swap", "sign"), "trade");
});

test("money-moving tools are sign tools (a Confirm card), never auto", () => {
  for (const n of ["base.transfer", "arbitrum.transfer", "robinhood.transfer", "monad.transfer", "uniswap.swap", "polymarket.order", "zcash.buy"]) {
    const t = toolByName(n)!;
    assert.equal(t.risk, "sign", n);
    assert.ok(!t.auto, n);
    assert.ok(t.prepare && t.execute, n);
  }
});
