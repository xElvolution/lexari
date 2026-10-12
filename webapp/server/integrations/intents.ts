/**
 * Aurora Intents (https://intents.aurora.dev): the cross-chain engine behind the agent's one balance. The balance
 * lives on Solana; when a trade or payment needs funds on another chain, the agent routes them through the Aurora
 * Intents Swap API (any-chain liquidity, powered by NEAR Intents):
 *   intents.quote  : a dry quote, read only.
 *   intents.route  : a live quote with a one-time deposit address, shown as ONE Confirm card. Only your Confirm sends
 *                    the deposit from the agent's Solana wallet; Aurora Intents delivers on the destination chain.
 *   intents.status : where a routed swap is.
 * Aurora Intents runs on mainnets only. Lexari keeps every money-moving tool on testnets unless the server opts in,
 * so routing with real funds needs AURORA_INTENTS_LIVE=1 and SOLANA_MAINNET_RPC; without them quotes still work and
 * the route tool says why it can't send. Env: AURORA_INTENTS_API_KEY (studio.aurora.dev), AURORA_INTENTS_URL.
 */
import { z } from "zod";
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { evmAddress } from "./evm";
import { Reject } from "./reject";
import type { AgentRef, Executed, GrantLimits, Prepared, ReadResult, ToolDef } from "./registry";

const base = () => (process.env.AURORA_INTENTS_URL || "https://intents-api.aurora.dev").replace(/\/+$/, "");
const key = () => process.env.AURORA_INTENTS_API_KEY?.trim() || "";
export const intentsReady = () => !!key();
export const intentsLive = () => intentsReady() && process.env.AURORA_INTENTS_LIVE === "1" && !!process.env.SOLANA_MAINNET_RPC;
const MAINNET_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const CHAIN_ALIAS: Record<string, string> = { solana: "sol", sol: "sol", ethereum: "eth", eth: "eth", base: "base", arbitrum: "arb", arb: "arb", monad: "monad", hyperliquid: "hypercore", hypercore: "hypercore", polygon: "pol", bsc: "bsc", bnb: "bsc", optimism: "op", op: "op", avalanche: "avax", near: "near", bitcoin: "btc", btc: "btc", sui: "sui", tron: "tron", gnosis: "gnosis" };
const chainOf = (s: string) => CHAIN_ALIAS[s.trim().toLowerCase()] || s.trim().toLowerCase();

export type Token = { assetId: string; decimals: number; blockchain: string; symbol: string; price: number; contractAddress?: string };
let tokCache: { at: number; list: Token[] } | null = null;
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!intentsReady()) throw new Reject("Aurora Intents is not set up on this server yet (no API key), so I can't route across chains.");
  const r = await fetch(`${base()}${path.replace("{key}", encodeURIComponent(key()))}`, { ...init, headers: { "content-type": "application/json", accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  const j = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (!r.ok) throw new Reject(`Aurora Intents said: ${String(j.message || `HTTP ${r.status}`).slice(0, 160)}`);
  return j;
}
export async function intentsTokens() {
  if (tokCache && Date.now() - tokCache.at < 300_000) return tokCache.list;
  const j = await api<{ tokens: Token[] }>("/api/tokens/{key}");
  tokCache = { at: Date.now(), list: j.tokens || [] };
  return tokCache.list;
}
async function token(symbol: string, chain: string) {
  const c = chainOf(chain), s = symbol.trim().toUpperCase();
  const all = await intentsTokens();
  const t = all.find((x) => x.blockchain === c && x.symbol.toUpperCase() === s);
  if (!t) throw new Reject(`Aurora Intents doesn't route ${s} on ${chain}.`);
  return t;
}
const atoms = (n: number, d: number) => (BigInt(Math.round(n * 1e6)) * BigInt(10) ** BigInt(d) / BigInt(1e6)).toString();

type Quote = { quote: { depositAddress?: string; amountIn: string; amountInFormatted: string; amountOut: string; amountOutFormatted: string; amountOutUsd?: string; amountInUsd?: string; minAmountOut?: string; deadline?: string; timeEstimate?: number } };
function recipientFor(agent: AgentRef, chain: string) {
  const c = chainOf(chain);
  if (c === "sol") return agent.keypair().publicKey.toBase58();
  if (["eth", "base", "arb", "monad", "hypercore", "pol", "bsc", "op", "avax", "gnosis"].includes(c)) return evmAddress(agent.userId, agent.slug);
  throw new Reject(`I don't have my own wallet on ${chain}, so I can't receive there.`);
}
async function quote(agent: AgentRef, i: QIn, dry: boolean, slippageBps: number) {
  const from = await token(i.from, "sol");
  const to = await token(i.to, i.toChain);
  const body = {
    dry, swapType: "EXACT_INPUT", depositType: "ORIGIN_CHAIN", depositMode: "SIMPLE", quoteWaitingTimeMs: 3000, slippageTolerance: slippageBps,
    originAsset: from.assetId, destinationAsset: to.assetId, amount: atoms(i.amount, from.decimals),
    refundTo: agent.keypair().publicKey.toBase58(), refundType: "ORIGIN_CHAIN", recipient: recipientFor(agent, i.toChain), recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  const q = await api<Quote>("/api/quote/{key}", { method: "POST", body: JSON.stringify(body) });
  return { from, to, q: q.quote, usdIn: Number(q.quote.amountInUsd) || i.amount * from.price };
}

const qIn = z.object({ from: z.string().max(12).default("USDC"), to: z.string().min(1).max(12), toChain: z.string().min(2).max(20), amount: z.coerce.number().positive() }).passthrough();
type QIn = z.output<typeof qIn>;
const quoteTool: ToolDef = {
  name: "intents.quote", connector: "intents", risk: "read", input: qIn,
  hint: 'intents.quote {"from":"USDC","to":"USDC","toChain":"hyperliquid","amount":20} : what moving part of your balance (on Solana) to another chain through Aurora Intents would deliver. Read only.',
  run: async (i: never, agent: AgentRef): Promise<ReadResult> => {
    const p = i as QIn;
    const { from, to, q } = await quote(agent, p, true, 100);
    return { summary: "Aurora Intents quote", text: `Aurora Intents: ${q.amountInFormatted} ${from.symbol} on Solana becomes about ${q.amountOutFormatted} ${to.symbol} on ${p.toChain}${q.timeEstimate ? `, in about ${q.timeEstimate}s` : ""}. Quote only; nothing moved.` };
  },
};

type RoutePlan = { kind: "intents"; deposit: string; from: string; amount: number; atoms: string; to: string; toChain: string; out: string; deadline?: string };
const routeTool: ToolDef = {
  name: "intents.route", connector: "intents", risk: "sign", input: qIn,
  hint: 'intents.route {"from":"USDC","to":"USDC","toChain":"hyperliquid","amount":20} : prepare ONE Confirm card that moves part of your balance from Solana to another chain through Aurora Intents (so a trade or payment there can run). The person confirms it.',
  prepare: async (i: never, agent: AgentRef, limits: GrantLimits): Promise<Prepared> => {
    const p = i as QIn;
    if (!intentsLive()) throw new Reject("Cross-chain routing with real funds is off on this server (Aurora Intents runs on mainnets and Lexari is on testnets). I can still quote it.");
    const sym = p.from.toUpperCase();
    if (sym !== "USDC" && sym !== "SOL") throw new Reject("I route from your balance in USDC or SOL.");
    const slip = Math.min(limits.maxSlippageBps, 100);
    const { from, to, q, usdIn } = await quote(agent, p, false, slip);
    if (usdIn > limits.perTxUsd) throw new Reject(`That's about $${usdIn.toFixed(2)}, over your $${limits.perTxUsd} per trade limit.`);
    if (!q.depositAddress) throw new Reject("Aurora Intents didn't return a deposit address. Try again in a moment.");
    return {
      title: `Move ${q.amountInFormatted} ${from.symbol} to ${p.toChain}`, chain: "intents", usdMicros: Math.round(usdIn * 1e6), summary: `Route to ${p.toChain} via Aurora Intents`,
      rows: [["From", `${q.amountInFormatted} ${from.symbol} in your balance (Solana)`], ["You get", `About ${q.amountOutFormatted} ${to.symbol} on ${p.toChain}`], ["Max slippage", `${slip / 100}%`], ["Route", "Aurora Intents"], ...(q.timeEstimate ? [["Time", `About ${q.timeEstimate}s`] as [string, string]] : []), ["Refunds", "Back to your balance if it can't fill"]],
      plan: { kind: "intents", deposit: q.depositAddress, from: from.symbol, amount: p.amount, atoms: q.amountIn, to: to.symbol, toChain: p.toChain, out: q.amountOutFormatted, deadline: q.deadline } satisfies RoutePlan,
    };
  },
  execute: async (pl: never, agent: AgentRef): Promise<Executed> => {
    const p = pl as RoutePlan;
    if (p.kind !== "intents" || !intentsLive()) throw new Reject("Routing is off. Nothing was sent.");
    if (p.deadline && Date.parse(p.deadline) < Date.now() + 60_000) throw new Reject("That quote expired. Ask me again for a fresh one. Nothing was sent.");
    const c = new Connection(process.env.SOLANA_MAINNET_RPC!, "confirmed");
    const kp = agent.keypair(), to = new PublicKey(p.deposit);
    const ixs: TransactionInstruction[] = [];
    if (p.from === "SOL") ixs.push(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: to, lamports: BigInt(p.atoms) }));
    else {
      const mint = new PublicKey(MAINNET_USDC);
      const src = getAssociatedTokenAddressSync(mint, kp.publicKey, true), dst = getAssociatedTokenAddressSync(mint, to, true);
      ixs.push(createAssociatedTokenAccountIdempotentInstruction(kp.publicKey, dst, to, mint), createTransferCheckedInstruction(src, mint, dst, kp.publicKey, BigInt(p.atoms), 6));
    }
    const tx = new Transaction().add(...ixs);
    tx.feePayer = kp.publicKey;
    tx.recentBlockhash = (await c.getLatestBlockhash()).blockhash;
    tx.sign(kp);
    const sim = await c.simulateTransaction(tx);
    if (sim.value.err) throw new Reject(`The deposit wouldn't go through (${JSON.stringify(sim.value.err).slice(0, 80)}). Nothing was sent.`);
    const sig = await c.sendRawTransaction(tx.serialize());
    await api("/api/deposit/submit/{key}", { method: "POST", body: JSON.stringify({ txHash: sig, depositAddress: p.deposit }) }).catch(() => null);
    return { sig, confirmed: false, rows: [["Deposit", `${p.amount} ${p.from} sent to Aurora Intents`], ["Delivers", `About ${p.out} ${p.to} on ${p.toChain}`], ["Deposit address", p.deposit]], receipt: { amount: `${p.amount} ${p.from}`, label: `Aurora Intents to ${p.toChain}`, url: `https://solscan.io/tx/${sig}` } };
  },
};

const statusTool: ToolDef = {
  name: "intents.status", connector: "intents", risk: "read", input: z.object({ depositAddress: z.string().min(20).max(80) }).passthrough(),
  hint: 'intents.status {"depositAddress":"…"} : where a cross-chain route through Aurora Intents is (pending, processing, success, refunded).',
  run: async (i: never): Promise<ReadResult> => {
    const { depositAddress } = i as { depositAddress: string };
    const j = await api<{ status?: string; swapDetails?: { amountOutFormatted?: string; destinationChainTxHashes?: { hash: string }[] } }>(`/api/status/{key}?depositAddress=${encodeURIComponent(depositAddress)}`);
    const out = j.swapDetails?.amountOutFormatted, h = j.swapDetails?.destinationChainTxHashes?.[0]?.hash;
    return { summary: "Aurora Intents status", text: `Aurora Intents route ${depositAddress.slice(0, 8)}…: ${j.status || "unknown"}${out ? `, delivered ${out}` : ""}${h ? ` (tx ${h})` : ""}.` };
  },
};

export const INTENTS_TOOLS: ToolDef[] = [quoteTool, routeTool, statusTool];
export const intentsLamports = (sol: number) => Math.round(sol * LAMPORTS_PER_SOL);

/** Deposit into the agent's balance: any Aurora Intents coin in, USDC on Solana out, to the agent's own wallet. */
export async function intentsDepositQuote(me: string, ch: { assetId: string; decimals: number }, amount: number) {
  const usdc = (await intentsTokens()).find((x) => x.blockchain === "sol" && x.symbol.toUpperCase() === "USDC");
  if (!usdc) throw new Reject("Aurora Intents isn't listing USDC on Solana right now.");
  const q = await api<{ quote: { depositAddress: string; depositMemo?: string; amountOutFormatted: string; deadline?: string } }>("/api/quote/{key}", { method: "POST", body: JSON.stringify({
    dry: false, swapType: "EXACT_INPUT", depositType: "ORIGIN_CHAIN", depositMode: "SIMPLE", quoteWaitingTimeMs: 3000, slippageTolerance: 100,
    originAsset: ch.assetId, destinationAsset: usdc.assetId, amount: atoms(amount, ch.decimals),
    refundTo: me, refundType: "INTENTS", recipient: me, recipientType: "DESTINATION_CHAIN", deadline: new Date(Date.now() + 60 * 60_000).toISOString(),
  }) });
  if (!q.quote.depositAddress) throw new Reject("Aurora Intents didn't return a deposit address. Try again in a moment.");
  return q.quote;
}
