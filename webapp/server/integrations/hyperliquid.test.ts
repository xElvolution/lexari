import { test } from "node:test";
import assert from "node:assert/strict";
import { roundPx, roundSz, signL1, toWire } from "./hyperliquid";

const key = Uint8Array.from(Buffer.from("0123456789012345678901234567890123456789012345678901234567890123", "hex"));

test("L1 order signature matches Hyperliquid's own SDK test vector (testnet)", async () => {
  const action = { type: "order", orders: [{ a: 1, b: true, p: "100", s: "100", r: false, t: { limit: { tif: "Gtc" } } }], grouping: "na" };
  const sig = await signL1(key, action, 0);
  assert.equal(sig.r, "0x82b2ba28e76b3d761093aaded1b1cdad4960b3af30212b343fb2e6cdfa4e3d54");
  assert.equal(sig.s, "0x6b53878fc99d26047f4d7e8c90eb98955a109f44209163f52d8dc4278cbbd9f5");
  assert.equal(sig.v, 27);
});

test("wire numbers follow Hyperliquid's rules", () => {
  assert.equal(toWire(100), "100");
  assert.equal(toWire(0.0015), "0.0015");
  assert.equal(toWire(-0), "0");
  assert.equal(roundPx(3456.789, 4), 3456.8); // 5 significant figures
  assert.equal(roundPx(0.123456, 0), 0.12346);
  assert.equal(roundPx(1.234567, 4), 1.23); // 6 - szDecimals decimals
  assert.equal(roundPx(70000, 5), 70000); // integers always allowed
  assert.equal(roundSz(0.123456, 4), 0.1234);
});
