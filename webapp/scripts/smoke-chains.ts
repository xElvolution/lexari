/**
 * Live smoke test of the chain integrations' read tools (no keys needed, nothing moves):
 *   cd webapp && npx tsx --env-file=.env.production.local scripts/smoke-chains.ts
 * Optional: SMOKE_SEND=1 also prepares and executes a tiny self-funded testnet send / swap for the smoke agent
 * (only when that wallet holds test funds). It never touches mainnet.
 */
import { Keypair } from "@solana/web3.js";
import { toolByName, type AgentRef } from "../server/integrations/registry";

const agent: AgentRef = { slug: "smoke", kind: "custom", name: "Smoke", userId: "lexari-smoke-test", keypair: () => Keypair.generate() };
const limits = { perTxUsd: 5, dailyUsd: 20, maxSlippageBps: 300 };
async function run(name: string, input: unknown) {
  const t = toolByName(name)!;
  try { const r = await t.run!(t.input.parse(input) as never, agent); console.log(`OK   ${name}: ${r.text.slice(0, 260)}`); }
  catch (e) { console.log(`FAIL ${name}: ${(e as Error).message.slice(0, 200)}`); }
}
async function sign(name: string, input: unknown) {
  const t = toolByName(name)!;
  try {
    const p = await t.prepare!(t.input.parse(input) as never, agent, limits);
    console.log(`CARD ${name}: ${p.title} | ${p.rows.map((r) => r.join(": ")).join(" | ")}`);
    if (process.env.SMOKE_SEND === "1") { const x = await t.execute!(p.plan as never, agent); console.log(`SENT ${name}: ${x.sig} confirmed=${x.confirmed} ${JSON.stringify(x.rows)}`); }
  } catch (e) { console.log(`STOP ${name}: ${(e as Error).message.slice(0, 220)}`); }
}
(async () => {
  for (const c of ["base", "ethereum", "arbitrum", "robinhood", "monad"]) await run(`${c}.wallet`, {});
  for (const c of ["base", "ethereum", "arbitrum"]) await run("uniswap.quote", { chain: c, sell: "ETH", buy: "USDC", amount: 0.001 });
  await run("polymarket.market", { market: "bitcoin" });
  await run("zcash.wallet", {});
  await run("zcash.quote", { amount: 5 });
  const args = process.argv.slice(2);
  if (args[0] === "send") await sign(`${args[1]}.transfer`, { to: args[2], asset: args[3] || "native", amount: Number(args[4] || 0.0001) });
  if (args[0] === "swap") await sign("uniswap.swap", { chain: args[1], sell: args[2], buy: args[3], amount: Number(args[4]) });
  if (args[0] === "order") await sign("polymarket.order", { market: args[1], outcome: args[2], usd: Number(args[3]) });
  if (args[0] === "zec") await sign("zcash.buy", { amount: Number(args[1]) });
})();
