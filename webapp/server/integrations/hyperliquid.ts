/**
 * Hyperliquid testnet (HyperCore perps) with Hyperliquid's API-wallet model.
 *
 * Each agent has two keys, both derived on the server like its other wallets (never stored):
 *  - its account (the master): the agent's EVM address (server/integrations/evm.ts). Test USDC sits here.
 *  - its API wallet: a separate trade-only key. The master approves it once (approveAgent); after that every order is
 *    signed by the API wallet, which Hyperliquid lets place and cancel orders but never withdraw or transfer funds.
 * Orders are sign tools: the agent prepares a Confirm card inside your per-trade, daily and slippage limits, and only
 * your Confirm places the order. Testnet only: a mainnet API URL is refused.
 *
 * Env (optional): HYPERLIQUID_API_URL (default https://api.hyperliquid-testnet.xyz).
 */
import { createHmac } from "node:crypto";
import { z } from "zod";
import { encode } from "@msgpack/msgpack";
import { keccak256, toHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { HttpError } from "../http";
import { addressOfKey, evmAddress, evmKey } from "./evm";
import { Reject } from "./reject";
import type { AgentRef, Executed, GrantLimits, Prepared, ReadResult, ToolDef } from "./registry";

export const HL_NETWORK = "Hyperliquid testnet";
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const AGENT_NAME = "lexari";
const MIN_ORDER_USD = 10;

export function hlApi() {
  const url = (process.env.HYPERLIQUID_API_URL || "https://api.hyperliquid-testnet.xyz").replace(/\/+$/, "");
  if (!/testnet/i.test(url)) throw new Reject("Hyperliquid runs on testnet only in Lexari right now.");
  return url;
}
export const hlExplorer = (addr: string) => `https://app.hyperliquid-testnet.xyz/explorer/address/${addr}`;

/* ---------- keys ---------- */
const hexKey = (k: Uint8Array) => toHex(k) as Hex;
/** The agent's trade-only API wallet key (server only). */
export function apiKeyOf(userId: string, slug: string): Uint8Array {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new HttpError(503, "Agent wallets are not set up on this server.");
  return new Uint8Array(createHmac("sha256", s).update(`lexari-agent-wallet:v1:hl-api:${userId}:${slug}`).digest());
}
export const hlAccount = (userId: string, slug: string) => evmAddress(userId, slug);
export const hlApiAddress = (userId: string, slug: string) => addressOfKey(apiKeyOf(userId, slug));

/* ---------- HTTP ---------- */
async function post<T>(path: "info" | "exchange", body: unknown): Promise<T> {
  const res = await fetch(`${hlApi()}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`hyperliquid ${path} ${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text) as T; } catch { throw new Error(`hyperliquid ${path}: not JSON: ${text.slice(0, 120)}`); }
}
const info = <T>(body: Record<string, unknown>) => post<T>("info", body);

type Meta = { universe: { name: string; szDecimals: number; maxLeverage: number; isDelisted?: boolean }[] };
type Clearing = { marginSummary: { accountValue: string; totalNtlPos: string }; withdrawable: string; assetPositions: { position: { coin: string; szi: string; entryPx: string | null; unrealizedPnl: string; leverage?: { value: number } } }[] };
type OpenOrder = { coin: string; side: "B" | "A"; limitPx: string; sz: string; oid: number };
type ExtraAgent = { address: string; name: string; validUntil: number };

export async function hlMarket(coinRaw: string) {
  const coin = coinRaw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/USDC?$|PERP$/, "") || coinRaw.toUpperCase();
  const [meta, mids] = await Promise.all([info<Meta>({ type: "meta" }), info<Record<string, string>>({ type: "allMids" })]);
  const asset = meta.universe.findIndex((u) => u.name.toUpperCase() === coin && !u.isDelisted);
  if (asset < 0) throw new Reject(`Hyperliquid testnet has no ${coin} perp.`);
  const u = meta.universe[asset];
  const mid = Number(mids[u.name]);
  if (!(mid > 0)) throw new Reject(`No live ${u.name} price on Hyperliquid testnet right now.`);
  return { coin: u.name, asset, szDecimals: u.szDecimals, maxLeverage: u.maxLeverage, mid };
}

/* ---------- number formatting (Hyperliquid's wire rules) ---------- */
/** A float as Hyperliquid's wire string: at most 8 decimals, no trailing zeros. */
export function toWire(x: number) {
  const s = x.toFixed(8).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}
/** A perp price: at most 5 significant figures and 6 - szDecimals decimals (integers are always allowed). */
export function roundPx(px: number, szDecimals: number) {
  if (Number.isInteger(px)) return px;
  const sig = Number(px.toPrecision(5));
  return Number(sig.toFixed(Math.max(0, 6 - szDecimals)));
}
export const roundSz = (sz: number, szDecimals: number) => Math.floor(sz * 10 ** szDecimals + 1e-9) / 10 ** szDecimals;

/* ---------- signing ---------- */
/** The hash Hyperliquid signs for an L1 action (orders, cancels): msgpack(action) + nonce + vault flag. */
export function actionHash(action: unknown, nonce: number, vault: string | null = null) {
  const packed = encode(action, { ignoreUndefined: true });
  const n = new Uint8Array(8);
  new DataView(n.buffer).setBigUint64(0, BigInt(nonce));
  const tail = vault ? new Uint8Array([1, ...Buffer.from(vault.slice(2), "hex")]) : new Uint8Array([0]);
  const all = new Uint8Array(packed.length + 8 + tail.length);
  all.set(packed, 0); all.set(n, packed.length); all.set(tail, packed.length + 8);
  return keccak256(all);
}
const splitSig = (sig: Hex) => ({ r: `0x${sig.slice(2, 66)}`, s: `0x${sig.slice(66, 130)}`, v: parseInt(sig.slice(130, 132), 16) });

export async function signL1(key: Uint8Array, action: unknown, nonce: number) {
  const acct = privateKeyToAccount(hexKey(key));
  const sig = await acct.signTypedData({
    domain: { name: "Exchange", version: "1", chainId: 1337, verifyingContract: ZERO },
    types: { Agent: [{ name: "source", type: "string" }, { name: "connectionId", type: "bytes32" }] },
    primaryType: "Agent",
    message: { source: "b", connectionId: actionHash(action, nonce) },
  });
  return splitSig(sig);
}

async function signApproveAgent(masterKey: Uint8Array, agentAddress: string, nonce: number) {
  const acct = privateKeyToAccount(hexKey(masterKey));
  const sig = await acct.signTypedData({
    domain: { name: "HyperliquidSignTransaction", version: "1", chainId: 421614, verifyingContract: ZERO },
    types: { "HyperliquidTransaction:ApproveAgent": [{ name: "hyperliquidChain", type: "string" }, { name: "agentAddress", type: "address" }, { name: "agentName", type: "string" }, { name: "nonce", type: "uint64" }] },
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message: { hyperliquidChain: "Testnet", agentAddress: agentAddress as Hex, agentName: AGENT_NAME, nonce: BigInt(nonce) },
  });
  return splitSig(sig);
}

type ExchangeReply = { status: "ok" | "err"; response?: string | { type: string; data?: { statuses?: ({ filled?: { totalSz: string; avgPx: string; oid: number }; resting?: { oid: number }; error?: string } | string)[] } } };

function friendlyHl(msg: string, account: string) {
  if (/does not exist|must deposit/i.test(msg)) return `My Hyperliquid testnet account (${account}) has no funds yet, so it can't trade. Send it test USDC on Hyperliquid testnet first.`;
  if (/insufficient margin|not enough/i.test(msg)) return "Not enough margin in my Hyperliquid testnet account for that order.";
  if (/minimum value/i.test(msg)) return `Hyperliquid's minimum order is $${MIN_ORDER_USD}.`;
  if (/could not immediately match/i.test(msg)) return "The market moved and nothing matched inside the slippage limit. Nothing was traded.";
  return `Hyperliquid said: ${msg.slice(0, 160)}`;
}

/** Makes sure the agent's API wallet is approved by its account (one approveAgent, signed by the account key). */
export async function ensureApiWallet(userId: string, slug: string) {
  const account = hlAccount(userId, slug);
  const apiAddr = hlApiAddress(userId, slug);
  const agents = await info<ExtraAgent[]>({ type: "extraAgents", user: account }).catch(() => [] as ExtraAgent[]);
  if (agents.some((a) => a.address.toLowerCase() === apiAddr.toLowerCase() && (!a.validUntil || a.validUntil > Date.now() + 60_000))) return { approved: false, apiAddr };
  const nonce = Date.now();
  const action = { type: "approveAgent", signatureChainId: "0x66eee", hyperliquidChain: "Testnet", agentAddress: apiAddr, agentName: AGENT_NAME, nonce };
  const r = await post<ExchangeReply>("exchange", { action, nonce, signature: await signApproveAgent(evmKey(userId, slug), apiAddr, nonce) });
  if (r.status !== "ok") throw new Reject(friendlyHl(typeof r.response === "string" ? r.response : "the API wallet couldn't be approved", account));
  return { approved: true, apiAddr };
}

/**
 * Revoke (integration switched off, removed or expired): approve a throwaway address under the same agent name, which
 * replaces Lexari's API wallet on Hyperliquid, so its key can no longer trade. The next allowed order approves it again.
 */
export async function revokeApiWallet(userId: string, slug: string) {
  const account = hlAccount(userId, slug), apiAddr = hlApiAddress(userId, slug);
  const agents = await info<ExtraAgent[]>({ type: "extraAgents", user: account }).catch(() => [] as ExtraAgent[]);
  if (!agents.some((a) => a.address.toLowerCase() === apiAddr.toLowerCase())) return false;
  const burn = privateKeyToAccount(generatePrivateKey()).address;
  const nonce = Date.now();
  const action = { type: "approveAgent", signatureChainId: "0x66eee", hyperliquidChain: "Testnet", agentAddress: burn, agentName: AGENT_NAME, nonce };
  const r = await post<ExchangeReply>("exchange", { action, nonce, signature: await signApproveAgent(evmKey(userId, slug), burn, nonce) });
  return r.status === "ok";
}

/* ---------- tools ---------- */
const num = z.union([z.number(), z.string().regex(/^\s*\$?\d+(\.\d+)?\s*$/).transform((s) => Number(s.replace(/[$\s]/g, "")))]);
const money = (usd: number) => `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const accountTool: ToolDef = {
  name: "hyperliquid.account", connector: "hyperliquid", risk: "read", input: z.object({}).passthrough(),
  hint: "hyperliquid.account {} : your Hyperliquid testnet account: address, value, positions, open orders and whether your trade-only API wallet is approved.",
  run: async (_i: never, agent: AgentRef): Promise<ReadResult> => {
    const account = hlAccount(agent.userId, agent.slug), apiAddr = hlApiAddress(agent.userId, agent.slug);
    const [cs, orders, extra] = await Promise.all([
      info<Clearing>({ type: "clearinghouseState", user: account }),
      info<OpenOrder[]>({ type: "openOrders", user: account }).catch(() => [] as OpenOrder[]),
      info<ExtraAgent[]>({ type: "extraAgents", user: account }).catch(() => [] as ExtraAgent[]),
    ]);
    const value = Number(cs.marginSummary?.accountValue || 0);
    const pos = (cs.assetPositions || []).filter((p) => Number(p.position.szi) !== 0).map((p) => `${p.position.coin} ${Number(p.position.szi) > 0 ? "long" : "short"} ${Math.abs(Number(p.position.szi))} @ ${p.position.entryPx} (uPnL ${money(Number(p.position.unrealizedPnl))})`);
    const approved = extra.some((a) => a.address.toLowerCase() === apiAddr.toLowerCase());
    return {
      summary: "Checked its Hyperliquid account",
      text: `Your Hyperliquid testnet account: ${account}. Account value ${money(value)}, withdrawable ${money(Number(cs.withdrawable || 0))}. ${pos.length ? `Positions: ${pos.join("; ")}.` : "No open positions."} ${orders.length ? `Open orders: ${orders.slice(0, 6).map((o) => `${o.coin} ${o.side === "B" ? "buy" : "sell"} ${o.sz} @ ${o.limitPx}`).join("; ")}.` : "No open orders."} Trade-only API wallet ${apiAddr}: ${approved ? "approved" : "not approved yet (it's approved automatically with the first order you confirm)"}.${value <= 0 ? " The account has no test USDC yet: the person has to send test USDC to it on Hyperliquid testnet before it can trade." : ""}`,
    };
  },
};

const priceInput = z.object({ coins: z.array(z.string().max(12)).max(6).optional(), coin: z.string().max(12).optional() }).passthrough();
const priceTool: ToolDef = {
  name: "hyperliquid.price", connector: "hyperliquid", risk: "read", input: priceInput,
  hint: `hyperliquid.price {"coins":["BTC","ETH"]} : live Hyperliquid testnet mid prices (testnet prices can differ from mainnet).`,
  run: async (i: z.output<typeof priceInput>): Promise<ReadResult> => {
    const want = [...new Set([...(i.coins || []), ...(i.coin ? [i.coin] : [])].map((c) => c.toUpperCase()))].slice(0, 6);
    if (!want.length) throw new Reject("Say which coins to price.");
    const mids = await info<Record<string, string>>({ type: "allMids" });
    return { summary: `Checked ${want.join(", ")} on Hyperliquid`, text: `Hyperliquid testnet mid prices: ${want.map((c) => (mids[c] ? `${c} $${Number(mids[c]).toLocaleString("en-US", { maximumFractionDigits: 6 })}` : `${c}: no testnet market`)).join("; ")}. These are testnet prices.` };
  },
};

const orderInput = z.object({
  coin: z.string().min(1).max(16), side: z.string().max(8), size: num.optional(), usd: num.optional(),
  type: z.string().max(8).optional(), price: num.optional(), reduceOnly: z.boolean().optional(), slippage: num.optional(), slippageBps: num.optional(),
  takeProfit: num.optional(), stopLoss: num.optional(), tp: num.optional(), sl: num.optional(),
}).passthrough();
type OrderIn = z.output<typeof orderInput>;
type OrderPlan = { kind: "hl-order"; coin: string; asset: number; isBuy: boolean; px: string; sz: string; tif: "Ioc" | "Gtc"; reduceOnly: boolean; account: string; explorer: string; tp?: string; sl?: string; tpPx?: string; slPx?: string };

const orderTool: ToolDef = {
  name: "hyperliquid.order", connector: "hyperliquid", risk: "sign", input: orderInput,
  hint: `hyperliquid.order {"coin":"ETH","side":"buy","usd":12,"type":"market"} : prepare a perp order on Hyperliquid testnet from YOUR account (side buy/sell, "usd" notional or "size" in coins, type market or limit with "price", optional "reduceOnly", optional "takeProfit" and "stopLoss" trigger prices that close the position); the person confirms it. Minimum $${MIN_ORDER_USD}.`,
  prepare: async (i: OrderIn, agent: AgentRef, limits: GrantLimits): Promise<Prepared> => {
    const side = i.side.toLowerCase();
    if (!["buy", "sell", "long", "short"].includes(side)) throw new Reject("Say buy (long) or sell (short).");
    const isBuy = side === "buy" || side === "long";
    const m = await hlMarket(i.coin);
    const limit = (i.type || (i.price ? "limit" : "market")).toLowerCase() === "limit";
    if (limit && !(Number(i.price) > 0)) throw new Reject("A limit order needs a price.");
    const slipBps = Math.round(i.slippageBps !== undefined ? Number(i.slippageBps) : i.slippage !== undefined ? Number(i.slippage) * 100 : Math.min(limits.maxSlippageBps, 100));
    if (!limit && slipBps > limits.maxSlippageBps) throw new Reject(`That's ${slipBps / 100}% slippage, over your ${limits.maxSlippageBps / 100}% limit for Hyperliquid.`);
    if (!limit && slipBps < 1) throw new Reject("Slippage has to be above 0.");
    const px = roundPx(limit ? Number(i.price) : m.mid * (isBuy ? 1 + slipBps / 1e4 : 1 - slipBps / 1e4), m.szDecimals);
    const rawSz = i.size !== undefined ? Number(i.size) : i.usd !== undefined ? Number(i.usd) / m.mid : NaN;
    if (!(rawSz > 0)) throw new Reject("Say how much: a size in coins or a dollar amount.");
    const sz = roundSz(rawSz, m.szDecimals);
    if (!(sz > 0)) throw new Reject(`That's below the smallest ${m.coin} size on Hyperliquid.`);
    const notional = sz * Math.max(px, m.mid);
    if (notional < MIN_ORDER_USD && !i.reduceOnly) throw new Reject(`Hyperliquid's minimum order is $${MIN_ORDER_USD}; that's ${money(notional)}.`);
    if (notional > limits.perTxUsd) throw new Reject(`That's ${money(notional)}, over your $${limits.perTxUsd} per trade limit for Hyperliquid.`);
    const account = hlAccount(agent.userId, agent.slug);
    const cs = await info<Clearing>({ type: "clearinghouseState", user: account }).catch(() => null);
    if (!cs || Number(cs.marginSummary?.accountValue || 0) <= 0) throw new Reject(`My Hyperliquid testnet account (${account}) has no test USDC yet. Send some to it on Hyperliquid testnet, then ask again.`);
    const tpRaw = i.takeProfit ?? i.tp, slRaw = i.stopLoss ?? i.sl;
    const tp = tpRaw !== undefined ? Number(tpRaw) : undefined, sl = slRaw !== undefined ? Number(slRaw) : undefined;
    const ref = limit ? px : m.mid;
    if (tp !== undefined && !(tp > 0 && (isBuy ? tp > ref : tp < ref))) throw new Reject(`Take profit has to be ${isBuy ? "above" : "below"} the entry price ($${toWire(ref)}).`);
    if (sl !== undefined && !(sl > 0 && (isBuy ? sl < ref : sl > ref))) throw new Reject(`Stop loss has to be ${isBuy ? "below" : "above"} the entry price ($${toWire(ref)}).`);
    if ((tp !== undefined || sl !== undefined) && i.reduceOnly) throw new Reject("Take profit and stop loss go with an opening order, not a reduce only one.");
    const exitPx = (t: number) => toWire(roundPx(t * (isBuy ? 1 - slipBps / 1e4 : 1 + slipBps / 1e4), m.szDecimals));
    const plan: OrderPlan = { kind: "hl-order", coin: m.coin, asset: m.asset, isBuy, px: toWire(px), sz: toWire(sz), tif: limit ? "Gtc" : "Ioc", reduceOnly: !!i.reduceOnly, account, explorer: hlExplorer(account),
      ...(tp !== undefined ? { tp: toWire(roundPx(tp, m.szDecimals)), tpPx: exitPx(tp) } : {}), ...(sl !== undefined ? { sl: toWire(roundPx(sl, m.szDecimals)), slPx: exitPx(sl) } : {}) };
    const what = `${isBuy ? "Buy" : "Sell"} ${toWire(sz)} ${m.coin}`;
    return {
      title: `${what} on Hyperliquid`, chain: "hyperliquid", usdMicros: Math.round(notional * 1e6), summary: `${what} perp`,
      rows: [
        ["Order", `${limit ? "Limit" : "Market"} ${isBuy ? "buy (long)" : "sell (short)"}${i.reduceOnly ? ", reduce only" : ""}`],
        ["Size", `${toWire(sz)} ${m.coin} ≈ ${money(notional)}`],
        [limit ? "Limit price" : "Worst price", `$${toWire(px)}${limit ? "" : ` (${slipBps / 100}% slippage)`}`],
        ["Mid price", `$${toWire(m.mid)} (testnet)`],
        ...(plan.tp ? [["Take profit", `$${plan.tp} (closes the position)`] as [string, string]] : []),
        ...(plan.sl ? [["Stop loss", `$${plan.sl} (closes the position)`] as [string, string]] : []),
        ["Signed by", "Trade-only API wallet (can't withdraw)"],
        ["Account", `${account.slice(0, 6)}…${account.slice(-4)}`],
      ],
      plan,
    };
  },
  execute: async (p: OrderPlan, agent: AgentRef): Promise<Executed> => {
    if (p.kind !== "hl-order") throw new Reject("That order can't run any more.");
    await ensureApiWallet(agent.userId, agent.slug);
    const order = { a: p.asset, b: p.isBuy, p: p.px, s: p.sz, r: p.reduceOnly, t: { limit: { tif: p.tif } } };
    const exits = [
      ...(p.tp ? [{ a: p.asset, b: !p.isBuy, p: p.tpPx!, s: p.sz, r: true, t: { trigger: { isMarket: true, triggerPx: p.tp, tpsl: "tp" } } }] : []),
      ...(p.sl ? [{ a: p.asset, b: !p.isBuy, p: p.slPx!, s: p.sz, r: true, t: { trigger: { isMarket: true, triggerPx: p.sl, tpsl: "sl" } } }] : []),
    ];
    const action = { type: "order", orders: [order, ...exits], grouping: exits.length ? "normalTpsl" : "na" };
    const nonce = Date.now();
    const r = await post<ExchangeReply>("exchange", { action, nonce, signature: await signL1(apiKeyOf(agent.userId, agent.slug), action, nonce), vaultAddress: null });
    if (r.status !== "ok" || typeof r.response === "string") throw new Reject(friendlyHl(typeof r.response === "string" ? r.response : "the order was refused", p.account));
    const st = r.response?.data?.statuses?.[0];
    if (!st || typeof st === "string") throw new Reject(friendlyHl(typeof st === "string" ? st : "no order status came back", p.account));
    if (st.error) throw new Reject(friendlyHl(st.error, p.account));
    const exitRows: [string, string][] = [...(p.tp ? [["Take profit", `Set at $${p.tp}`] as [string, string]] : []), ...(p.sl ? [["Stop loss", `Set at $${p.sl}`] as [string, string]] : [])];
    if (st.filled) return { sig: String(st.filled.oid), confirmed: true, rows: [...exitRows, ["Filled", `${st.filled.totalSz} ${p.coin} @ $${st.filled.avgPx}`], ["Order id", String(st.filled.oid)]] };
    if (st.resting) return { sig: String(st.resting.oid), confirmed: true, rows: [...exitRows, ["Resting", `Limit order open at $${p.px}`], ["Order id", String(st.resting.oid)]] };
    throw new Reject("Hyperliquid didn't say what happened to the order. Check the account before trying again.");
  },
};

export const HL_TOOLS: ToolDef[] = [accountTool, priceTool, orderTool];
export const HL_HINT = "Hyperliquid: you trade perps on Hyperliquid testnet from your own account with a trade-only API wallet that can never withdraw. Check hyperliquid.account before saying what you hold. Orders only prepare a Confirm card; never claim a fill until the card says so. Testnet USDC only, never real money.";
