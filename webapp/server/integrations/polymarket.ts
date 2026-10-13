/**
 * Polymarket orders through its CLOB (https://clob.polymarket.com), signed by the agent's own EVM key:
 *  - polymarket.market : one market's outcomes with their live CLOB prices (best bid / ask) and token ids. Read only.
 *  - polymarket.order  : a BUY of one outcome for a dollar amount (a FOK market order, or a limit price you name).
 *                        A sign tool: only the person's Confirm sends it.
 * Polymarket settles in USDC.e on Polygon mainnet and has no public testnet order book, so placing orders is off
 * unless the server sets POLYMARKET_LIVE=1. The agent's Polygon address is its EVM address; fund it with USDC.e and
 * a little POL (gas for the one-time approval). The CLOB API key is derived from the agent's wallet (L1 auth), so no
 * Polymarket key is configured on the server. Env: POLYMARKET_LIVE, POLYGON_RPC, POLYMARKET_CLOB_URL.
 */
import { z } from "zod";
import { createPublicClient, createWalletClient, encodeFunctionData, erc20Abi, http, maxUint256, type Hex } from "viem";
import { polygon } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { evmAddress, evmKey } from "./evm";
import { getJson, type GammaEvent, type GammaMarket } from "./market";
import { Reject } from "./reject";
import type { AgentRef, Executed, GrantLimits, Prepared, ToolDef } from "./registry";

const CLOB = () => (process.env.POLYMARKET_CLOB_URL || "https://clob.polymarket.com").replace(/\/+$/, "");
const RPC = () => process.env.POLYGON_RPC || "https://polygon-rpc.com";
export const polymarketLive = () => process.env.POLYMARKET_LIVE === "1";
const USDCE = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" as Hex;
const EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as Hex;
const NEG_RISK_EXCHANGE = "0xC5d563A36AE78145C45a50134d48A1215220f80a" as Hex;
const parse = (s?: string): string[] => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } };

type Outcome = { label: string; tokenId: string; price: number; bid?: number; ask?: number };
type Mkt = { question: string; slug: string; url: string; negRisk: boolean; tickSize: string; minSize: number; outcomes: Outcome[] };
type GM = GammaMarket & { clobTokenIds?: string; negRisk?: boolean; orderPriceMinTickSize?: number; orderMinSize?: number; bestBid?: number; bestAsk?: number; enableOrderBook?: boolean };

/** Find one open market by slug or search words (the most traded match). */
export async function findMarket(q: string): Promise<Mkt> {
  const base = "https://gamma-api.polymarket.com";
  const term = q.trim().replace(/^https?:\/\/polymarket\.com\/(event|market)\//, "").replace(/[/?#].*$/, "");
  let m: GM | undefined;
  if (/^[a-z0-9-]+$/.test(term)) m = (await getJson<GM[]>(`${base}/markets?slug=${encodeURIComponent(term)}`).catch(() => []))[0];
  if (!m) {
    const r = await getJson<{ events?: (GammaEvent & { markets?: GM[] })[] }>(`${base}/public-search?q=${encodeURIComponent(q.slice(0, 80))}&limit_per_type=6&events_status=active&keep_closed_markets=0`);
    const all = (r.events || []).flatMap((e) => (e.markets || []) as GM[]).filter((x) => !x.closed && x.acceptingOrders !== false && x.enableOrderBook !== false);
    all.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
    m = all[0];
  }
  if (!m || m.closed || m.acceptingOrders === false) throw new Reject(`I couldn't find an open Polymarket market for "${q.slice(0, 60)}".`);
  const ids = parse(m.clobTokenIds), names = parse(m.outcomes), prices = parse(m.outcomePrices).map(Number);
  if (!ids.length) throw new Reject("That market has no order book.");
  const books = await Promise.all(ids.map((id) => getJson<{ bids?: { price: string }[]; asks?: { price: string }[] }>(`${CLOB()}/book?token_id=${id}`).catch(() => ({ bids: [], asks: [] }))));
  const best = (xs: { price: string }[] | undefined, hi: boolean) => { const v = (xs || []).map((x) => Number(x.price)).filter((n) => n > 0); return v.length ? (hi ? Math.max(...v) : Math.min(...v)) : undefined; };
  return {
    question: m.question || "", slug: m.slug || "", url: `https://polymarket.com/market/${m.slug}`, negRisk: !!m.negRisk, tickSize: String(m.orderPriceMinTickSize || 0.01), minSize: Number(m.orderMinSize) || 5,
    outcomes: ids.map((tokenId, n) => ({ label: names[n] || `Outcome ${n + 1}`, tokenId, price: prices[n] || 0, bid: best(books[n].bids, true), ask: best(books[n].asks, false) })),
  };
}

const mIn = z.object({ market: z.string().trim().min(2).max(200) }).passthrough();
const marketTool: ToolDef = {
  name: "polymarket.market", connector: "polymarket", risk: "read", input: mIn,
  hint: 'polymarket.market {"market":"bitcoin above 100k"} : one Polymarket market (slug, link or search words) with each outcome\'s live order book price. Read only.',
  run: async (i: never) => {
    const m = await findMarket((i as z.infer<typeof mIn>).market);
    const c = (n?: number) => (n === undefined ? "none" : `${Math.round(n * 1000) / 10}¢`);
    return { summary: `Read a Polymarket market`, text: `Polymarket: ${m.question} (${m.url}). ${m.outcomes.map((o) => `${o.label}: ${Math.round(o.price * 1000) / 10}% (buy at ${c(o.ask)}, sell at ${c(o.bid)})`).join("; ")}. Minimum order ${m.minSize} shares.${polymarketLive() ? "" : " Placing orders is switched off on this server."}` };
  },
};

const oIn = z.object({ market: z.string().trim().min(2).max(200), outcome: z.string().trim().min(1).max(80), usd: z.coerce.number().positive().optional(), amount: z.coerce.number().positive().optional(), price: z.coerce.number().gt(0).lt(1).optional() }).passthrough();
type OrderPlan = { kind: "pm-order"; tokenId: string; label: string; question: string; usd: number; price: number; limit: boolean; negRisk: boolean; tickSize: string };

const pub = () => createPublicClient({ chain: polygon, transport: http(RPC(), { timeout: 15_000, retryCount: 2 }) });
const account = (agent: AgentRef) => privateKeyToAccount(`0x${Buffer.from(evmKey(agent.userId, agent.slug)).toString("hex")}` as Hex);

const orderTool: ToolDef = {
  name: "polymarket.order", connector: "polymarket", risk: "sign", input: oIn,
  hint: 'polymarket.order {"market":"bitcoin above 100k","outcome":"Yes","usd":5} : prepare a Polymarket BUY of one outcome for a dollar amount (add "price":0.42 for a limit order). The person confirms it.',
  prepare: async (i: never, agent: AgentRef, limits: GrantLimits): Promise<Prepared> => {
    const p = i as z.infer<typeof oIn>;
    if (!polymarketLive()) throw new Reject("Placing Polymarket orders uses real USDC on Polygon mainnet (Polymarket has no testnet order book), and it's switched off on this server. I can still read markets and prices.");
    const usd = p.usd ?? p.amount;
    if (!usd) throw new Reject("How many dollars should I put on it?");
    if (usd > limits.perTxUsd) throw new Reject(`That's $${usd.toFixed(2)}, over your $${limits.perTxUsd} per trade limit for Polymarket.`);
    const m = await findMarket(p.market);
    const o = m.outcomes.find((x) => x.label.toLowerCase() === p.outcome.toLowerCase()) || m.outcomes.find((x) => x.label.toLowerCase().startsWith(p.outcome.toLowerCase()));
    if (!o) throw new Reject(`That market's outcomes are ${m.outcomes.map((x) => x.label).join(", ")}.`);
    const price = p.price ?? o.ask;
    if (!price) throw new Reject(`Nobody is selling ${o.label} right now. Name a limit price to place a resting order.`);
    if (usd / price < m.minSize) throw new Reject(`Polymarket's minimum here is ${m.minSize} shares, about $${(m.minSize * price).toFixed(2)} at ${Math.round(price * 100)}¢.`);
    const addr = evmAddress(agent.userId, agent.slug);
    const bal = await pub().readContract({ address: USDCE, abi: erc20Abi, functionName: "balanceOf", args: [addr as Hex] }).catch(() => { throw new Reject("Polygon didn't answer. Try again in a moment."); });
    if (Number(bal) / 1e6 < usd) throw new Reject(`My Polygon wallet (${addr}) holds ${(Number(bal) / 1e6).toFixed(2)} USDC.e. Fund it first (cross-chain routing can deliver USDC to Polygon).`);
    return {
      title: `Buy ${o.label} on Polymarket for $${usd.toFixed(2)}`, chain: "polygon", usdMicros: Math.round(usd * 1e6), summary: `Polymarket ${o.label}`,
      rows: [["Market", m.question.slice(0, 120)], ["Buy", o.label], ["Amount", `$${usd.toFixed(2)} USDC.e`], [p.price ? "Limit price" : "Price now", `${Math.round(price * 1000) / 10}¢ a share`], ["Shares", `About ${(usd / price).toFixed(2)}`], ["Pays if right", `About $${(usd / price).toFixed(2)}`], ["Order", p.price ? "Limit, rests on the book" : "Fill now or cancel"], ["Network", "Polygon mainnet, real funds"]],
      plan: { kind: "pm-order", tokenId: o.tokenId, label: o.label, question: m.question, usd, price, limit: !!p.price, negRisk: m.negRisk, tickSize: m.tickSize } satisfies OrderPlan,
    };
  },
  execute: async (pl: never, agent: AgentRef): Promise<Executed> => {
    const p = pl as OrderPlan;
    if (p.kind !== "pm-order" || !polymarketLive()) throw new Reject("Polymarket orders are off. Nothing was sent.");
    const acct = account(agent);
    const wallet = createWalletClient({ account: acct, chain: polygon, transport: http(RPC(), { timeout: 20_000, retryCount: 2 }) });
    const spender = p.negRisk ? NEG_RISK_EXCHANGE : EXCHANGE;
    const allowance = await pub().readContract({ address: USDCE, abi: erc20Abi, functionName: "allowance", args: [acct.address, spender] });
    if (allowance < BigInt(Math.ceil(p.usd * 1e6))) {
      const h = await wallet.sendTransaction({ to: USDCE, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, maxUint256] }) });
      const rc = await pub().waitForTransactionReceipt({ hash: h, timeout: 90_000 }).catch(() => null);
      if (rc?.status !== "success") throw new Reject(`Approving USDC.e for Polymarket didn't confirm (https://polygonscan.com/tx/${h}). No order was placed.`);
    }
    const pm = await import("@polymarket/clob-client");
    const l1 = new pm.ClobClient(CLOB(), pm.Chain.POLYGON, wallet);
    const creds = await l1.createOrDeriveApiKey();
    const client = new pm.ClobClient(CLOB(), pm.Chain.POLYGON, wallet, creds, 0, acct.address);
    const opts = { tickSize: p.tickSize as "0.1" | "0.01" | "0.001" | "0.0001", negRisk: p.negRisk };
    const r = (p.limit
      ? await client.createAndPostOrder({ tokenID: p.tokenId, price: p.price, size: Math.floor((p.usd / p.price) * 100) / 100, side: pm.Side.BUY }, opts, pm.OrderType.GTC)
      : await client.createAndPostMarketOrder({ tokenID: p.tokenId, amount: p.usd, side: pm.Side.BUY, price: p.price }, opts, pm.OrderType.FOK)) as { success?: boolean; orderID?: string; errorMsg?: string; status?: string; transactionsHashes?: string[] };
    if (!r?.orderID || r.success === false) throw new Reject(`Polymarket didn't take the order${r?.errorMsg ? ` (${String(r.errorMsg).slice(0, 120)})` : ""}. Nothing was bought.`);
    const tx = r.transactionsHashes?.[0];
    return { sig: tx || r.orderID, confirmed: r.status === "matched" || !!tx, rows: [["Order", r.orderID], ["Status", r.status || "placed"], ...(tx ? [["Explorer", `https://polygonscan.com/tx/${tx}`] as [string, string]] : [])], receipt: { amount: `$${p.usd.toFixed(2)}`, label: `Polymarket: ${p.label}`, url: tx ? `https://polygonscan.com/tx/${tx}` : undefined } };
  },
};

export const POLYMARKET_TOOLS: ToolDef[] = [marketTool, orderTool];
