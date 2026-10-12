/**
 * Monad testnet (chain 10143) plus the Monad sponsor data and trading venues:
 *  - monad.wallet: the agent's EVM address on Monad testnet and its MON balance (public RPC, no key).
 *  - nansen.wallet: Nansen wallet profile (balances and labels) for any address. Needs NANSEN_API_KEY.
 *  - kuru.quote: a Kuru orderbook quote on Monad testnet. Needs KURU_API_URL (Kuru's API base).
 * All three are reads. Nothing here signs, and without the key each tool says plainly that it is not set up.
 *
 * Env: MONAD_RPC (default https://testnet-rpc.monad.xyz), NANSEN_API_KEY, NANSEN_API_URL (default
 * https://api.nansen.ai/api/v1), KURU_API_URL, KURU_API_KEY (optional).
 */
import { z } from "zod";
import { evmAddress } from "./evm";
import { Reject } from "./reject";
import type { AgentRef, ToolDef } from "./registry";

export const MONAD = {
  name: "Monad", network: "Monad testnet", chainId: 10143,
  rpc: () => process.env.MONAD_RPC || "https://testnet-rpc.monad.xyz",
  explorerAddr: (a: string) => `https://testnet.monadexplorer.com/address/${a}`,
};
const isAddr = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

async function monadRpc<T>(method: string, params: unknown[]): Promise<T> {
  let last = "";
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(MONAD.rpc(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      if (r.status === 429 || r.status >= 500) { last = `HTTP ${r.status}`; await new Promise((s) => setTimeout(s, 400 * 2 ** i)); continue; }
      const j = (await r.json()) as { result?: T; error?: { message: string } };
      if (j.error) throw new Error(j.error.message);
      return j.result as T;
    } catch (e) { last = (e as Error).message; await new Promise((s) => setTimeout(s, 400 * 2 ** i)); }
  }
  throw new Reject(`Monad testnet didn't answer (${last}). Try again in a moment.`);
}
export async function monBalance(address: string) {
  const wei = await monadRpc<string>("eth_getBalance", [address, "latest"]);
  return Number(BigInt(wei || "0x0")) / 1e18;
}

const monadWallet: ToolDef = {
  name: "monad.wallet", connector: "monad", risk: "read", input: z.object({}).passthrough(),
  hint: "monad.wallet {} : your Monad testnet address (your EVM address) and its MON balance.",
  run: async (_i: never, agent: AgentRef) => {
    const a = evmAddress(agent.userId, agent.slug);
    const mon = await monBalance(a);
    return { summary: "Checked its Monad wallet", text: `Your Monad testnet address: ${a}. It holds ${+mon.toFixed(6)} MON (test MON, no real value). Explorer: ${MONAD.explorerAddr(a)}` };
  },
};

/* ---------- Nansen ---------- */
export const nansenReady = () => !!process.env.NANSEN_API_KEY;
const nansenIn = z.object({ address: z.string().trim(), chain: z.string().trim().toLowerCase().default("ethereum") });
const nansenWallet: ToolDef = {
  name: "nansen.wallet", connector: "nansen", risk: "read", input: nansenIn,
  hint: 'nansen.wallet {"address":"0x...","chain":"ethereum"} : Nansen profile of a wallet: its current token balances in USD. Read only.',
  run: async (i: never) => {
    const { address, chain } = i as z.infer<typeof nansenIn>;
    if (!nansenReady()) throw new Reject("Nansen is not set up on this server yet (no API key), so I can't read wallet data from it.");
    if (!isAddr(address) && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Reject("That doesn't look like a wallet address.");
    const base = (process.env.NANSEN_API_URL || "https://api.nansen.ai/api/v1").replace(/\/+$/, "");
    const r = await fetch(`${base}/profiler/address/current-balance`, {
      method: "POST", headers: { "content-type": "application/json", apiKey: process.env.NANSEN_API_KEY! },
      body: JSON.stringify({ address, chain, hide_spam_token: true, pagination: { page: 1, per_page: 10 } }), signal: AbortSignal.timeout(15000),
    });
    if (r.status === 401 || r.status === 403) throw new Reject("Nansen refused the API key on this server.");
    if (!r.ok) throw new Reject(`Nansen didn't answer (HTTP ${r.status}). Try again in a moment.`);
    const j = (await r.json()) as { data?: { token_symbol?: string; token_amount?: number; value_usd?: number }[] };
    const rows = (j.data || []).slice(0, 10);
    const total = rows.reduce((s, x) => s + (Number(x.value_usd) || 0), 0);
    const list = rows.map((x) => `${x.token_symbol || "?"}: ${(+Number(x.token_amount || 0).toFixed(4)).toLocaleString("en-US")} ($${(Number(x.value_usd) || 0).toFixed(2)})`).join("; ");
    return { summary: "Read a wallet on Nansen", text: rows.length ? `Nansen, ${address} on ${chain}: top holdings ${list}. About $${total.toFixed(2)} in these.` : `Nansen has no balances for ${address} on ${chain}.` };
  },
};

/* ---------- Kuru ---------- */
export const kuruReady = () => !!process.env.KURU_API_URL;
const kuruIn = z.object({ sell: z.string().trim().toUpperCase(), buy: z.string().trim().toUpperCase(), amount: z.coerce.number().positive() });
const kuruQuote: ToolDef = {
  name: "kuru.quote", connector: "kuru", risk: "read", input: kuruIn,
  hint: 'kuru.quote {"sell":"MON","buy":"USDC","amount":1} : a Kuru orderbook quote on Monad testnet. Read only, nothing trades.',
  run: async (i: never) => {
    const { sell, buy, amount } = i as z.infer<typeof kuruIn>;
    if (!kuruReady()) throw new Reject("Kuru is not set up on this server yet (no Kuru API endpoint), so I can't quote on it.");
    const base = process.env.KURU_API_URL!.replace(/\/+$/, "");
    const q = new URLSearchParams({ tokenIn: sell, tokenOut: buy, amount: String(amount), chainId: String(MONAD.chainId) });
    const r = await fetch(`${base}/quote?${q}`, { headers: process.env.KURU_API_KEY ? { authorization: `Bearer ${process.env.KURU_API_KEY}` } : {}, signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Reject(`Kuru didn't give a quote (HTTP ${r.status}).`);
    const j = (await r.json()) as { amountOut?: number | string; output?: number | string; price?: number | string };
    const out = Number(j.amountOut ?? j.output);
    if (!(out > 0)) throw new Reject(`Kuru has no route for ${sell} to ${buy} right now.`);
    return { summary: "Kuru quote", text: `Kuru on Monad testnet: ${amount} ${sell} gets about ${+out.toFixed(6)} ${buy}. This is a quote only; nothing traded.` };
  },
};

export const MONAD_TOOLS: ToolDef[] = [monadWallet, nansenWallet, kuruQuote];
