/**
 * Zcash for agents, through the cross-chain intents route (NEAR Intents lists ZEC on the Zcash chain itself):
 *  - Each agent has its own transparent Zcash address (t1...), derived from SESSION_SECRET like its other wallets, so
 *    no key is stored. Shielded (z / u) addresses are not used.
 *  - zcash.quote : what part of the balance (USDC on Solana) buys in ZEC, delivered to the agent's t-address. Read only.
 *  - zcash.buy   : the same route as ONE Confirm card (intents.route under the hood). Zcash has no public testnet
 *                  path through intents, so this is off unless the server sets
 *                  ZCASH_LIVE=1 (and real-funds routing, AURORA_INTENTS_LIVE=1).
 *  - zcash.wallet: its address, plus its balance when the server has a Zcash data source (BLOCKCHAIR_API_KEY, or
 *                  ZCASH_RPC pointing at a zebrad / zcashd node with the address index).
 * Sending ZEC out of the t-address is not built yet (it needs Zcash v5 transaction signing) and is listed as such.
 */
import { createHash, createHmac } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { z } from "zod";
import { HttpError } from "../http";
import { Reject } from "./reject";
import type { AgentRef, ToolDef } from "./registry";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const bs58 = {
  encode(b: Uint8Array) {
    let n = BigInt(`0x${Buffer.from(b).toString("hex") || "0"}`), out = "";
    while (n > BigInt(0)) { out = B58[Number(n % BigInt(58))] + out; n /= BigInt(58); }
    for (const x of b) { if (x !== 0) break; out = `1${out}`; }
    return out;
  },
  decode(s: string) {
    let n = BigInt(0);
    for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) throw new Error("bad base58"); n = n * BigInt(58) + BigInt(i); }
    let h = n.toString(16); if (h.length % 2) h = `0${h}`;
    const lead = s.match(/^1*/)![0].length;
    return Buffer.concat([Buffer.alloc(lead), Buffer.from(n === BigInt(0) ? "" : h, "hex")]);
  },
};
/** t1 prefix (mainnet P2PKH). */
const T1 = Uint8Array.of(0x1c, 0xb8);
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest();
const ripemd = (b: Uint8Array) => createHash("ripemd160").update(b).digest();

export function zcashKey(userId: string, slug: string): Uint8Array {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new HttpError(503, "Agent wallets are not set up on this server.");
  return new Uint8Array(createHmac("sha256", s).update(`lexari-agent-wallet:v1:zec:${userId}:${slug}`).digest());
}
/** Transparent P2PKH address of a secp256k1 key: base58check(0x1cb8 || hash160(compressed pubkey)). */
export function zcashAddressOfKey(priv: Uint8Array) {
  const h160 = ripemd(sha(secp256k1.getPublicKey(priv, true)));
  const payload = Buffer.concat([T1, h160]);
  return bs58.encode(Buffer.concat([payload, sha(sha(payload)).subarray(0, 4)]));
}
export const zcashAddress = (userId: string, slug: string) => zcashAddressOfKey(zcashKey(userId, slug));
export const isZcashT = (a: string) => {
  try { const b = bs58.decode(a); return b.length === 26 && b[0] === 0x1c && (b[1] === 0xb8 || b[1] === 0xbd) && sha(sha(b.subarray(0, 22))).subarray(0, 4).equals(Buffer.from(b.subarray(22))); } catch { return false; }
};
/** Zcash has no testnet route, so buying is off unless the server opts in with ZCASH_LIVE=1 (and real-funds routing). */
export const zcashLive = () => process.env.ZCASH_LIVE === "1";
export const zcashExplorer = (a: string) => `https://blockchair.com/zcash/address/${a}`;

/** ZEC balance of a t-address, or null when the server has no Zcash data source. */
export async function zecBalance(addr: string): Promise<number | null> {
  if (process.env.ZCASH_RPC) {
    const r = await fetch(process.env.ZCASH_RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getaddressbalance", params: [{ addresses: [addr] }] }), signal: AbortSignal.timeout(10_000) });
    const j = (await r.json().catch(() => ({}))) as { result?: { balance?: number }; error?: { message?: string } };
    if (j.error || typeof j.result?.balance !== "number") throw new Reject(`The Zcash node didn't answer (${j.error?.message?.slice(0, 80) || `HTTP ${r.status}`}).`);
    return j.result.balance / 1e8;
  }
  if (process.env.BLOCKCHAIR_API_KEY) {
    const r = await fetch(`https://api.blockchair.com/zcash/dashboards/address/${addr}?key=${encodeURIComponent(process.env.BLOCKCHAIR_API_KEY)}`, { signal: AbortSignal.timeout(10_000) });
    const j = (await r.json().catch(() => ({}))) as { data?: Record<string, { address?: { balance?: number } }> };
    if (!r.ok || !j.data) throw new Reject(`Blockchair didn't answer (HTTP ${r.status}).`);
    return (j.data[addr]?.address?.balance ?? 0) / 1e8;
  }
  return null;
}

const walletTool: ToolDef = {
  name: "zcash.wallet", connector: "zcash", risk: "read", input: z.object({}).passthrough(),
  hint: "zcash.wallet {} : your own transparent Zcash address (t1...) and, when available, its ZEC balance.",
  run: async (_i: never, agent: AgentRef) => {
    const a = zcashAddress(agent.userId, agent.slug);
    const bal = await zecBalance(a);
    return { summary: "Checked its Zcash wallet", text: `Your Zcash address (transparent, mainnet): ${a}.${bal === null ? " I can't read its balance on this server yet." : ` It holds ${+bal.toFixed(8)} ZEC.`} Sending ZEC out of it isn't available yet. Explorer: ${zcashExplorer(a)}` };
  },
};

const zIn = z.object({ amount: z.coerce.number().positive(), from: z.string().max(12).default("USDC") }).passthrough();
async function intents(name: string) {
  const { INTENTS_TOOLS } = await import("./intents");
  const t = INTENTS_TOOLS.find((x) => x.name === name);
  if (!t) throw new Reject("Cross-chain routing isn't available.");
  return t;
}
const quoteTool: ToolDef = {
  name: "zcash.quote", connector: "zcash", risk: "read", input: zIn,
  hint: 'zcash.quote {"amount":10} : how much ZEC $10 of your balance (USDC) buys, delivered to your own Zcash address. Read only.',
  run: async (i: never, agent: AgentRef) => {
    const p = i as z.infer<typeof zIn>;
    const r = await (await intents("intents.quote")).run!({ from: p.from, to: "ZEC", toChain: "zec", amount: p.amount } as never, agent);
    return { ...r, summary: "Zcash quote", text: r.text.replace(/^Aurora Intents: /, "Zcash quote: ").replace(/ on zec\b/, " on Zcash") };
  },
};
const buyTool: ToolDef = {
  name: "zcash.buy", connector: "zcash", risk: "sign", input: zIn,
  hint: 'zcash.buy {"amount":10} : prepare ONE Confirm card that turns $10 of your balance (USDC) into ZEC at your own Zcash address. The person confirms it.',
  prepare: async (i: never, agent: AgentRef, limits) => {
    const p = i as z.infer<typeof zIn>;
    if (!zcashLive()) throw new Reject("Buying ZEC uses real funds on Zcash mainnet (there's no Zcash testnet route), and it's switched off on this server. I can still quote it.");
    const prep = await (await intents("intents.route")).prepare!({ from: p.from, to: "ZEC", toChain: "zec", amount: p.amount } as never, agent, limits);
    const addr = zcashAddress(agent.userId, agent.slug);
    return { ...prep, title: prep.title.replace(/to zec$/, "into ZEC"), summary: "Buy ZEC", rows: [...prep.rows.map(([k, v]) => [k, k === "Route" ? "Cross-chain route" : v.replace(/ on zec$/, " on Zcash")] as [string, string]), ["Delivered to", `${addr.slice(0, 6)}…${addr.slice(-4)} (its Zcash address)`], ["Network", "Zcash mainnet, real funds"]] };
  },
  execute: async (pl: never, agent: AgentRef) => {
    if (!zcashLive()) throw new Reject("Buying ZEC is switched off on this server. Nothing was sent.");
    return (await intents("intents.route")).execute!(pl, agent);
  },
};

export const ZCASH_TOOLS: ToolDef[] = [walletTool, quoteTool, buyTool];
