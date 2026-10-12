/**
 * card.mpp: the agent pays for an API or resource with its Tempo card over MPP, the Machine Payments Protocol
 * (https://mpp.dev). The resource answers 402 with a payment Challenge; Lexari shows it as ONE Confirm card (who gets
 * paid, how much, in which Tempo stablecoin), checks the card's per payment and daily limits, and only after your
 * Confirm signs the TIP-20 payment Credential with mppx and fetches the resource. Tempo testnet only.
 */
import { z } from "zod";
import { Challenge } from "mppx";
import { Mppx, tempo } from "mppx/client";
import { privateKeyToAccount } from "viem/accounts";
import { cardRefusal } from "../agentpay/tempoCard";
import { evmKey } from "./evm";
import { TEMPO, TEMPO_TOKENS } from "./tempo";
import { Reject } from "./reject";
import type { AgentRef, Executed, GrantLimits, Prepared, ToolDef } from "./registry";

const mppIn = z.object({ url: z.string().url().max(500), method: z.enum(["GET", "POST"]).default("GET"), body: z.string().max(4000).optional() }).passthrough();
type MppPlan = { kind: "mpp"; url: string; method: "GET" | "POST"; body?: string; amount: string; currency: string; recipient?: string };
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "the merchant");

async function challengeOf(url: string, method: string, body?: string) {
  if (!/^https:\/\//.test(url)) throw new Reject("I only pay HTTPS resources.");
  const r = await fetch(url, { method, body, headers: body ? { "content-type": "application/json" } : undefined, signal: AbortSignal.timeout(15_000), redirect: "manual" });
  if (r.status !== 402) throw new Reject(`That resource didn't ask for payment (HTTP ${r.status}), so there's nothing to pay.`);
  let ch;
  try { ch = Challenge.fromResponse(r); } catch { throw new Reject("That 402 isn't an MPP payment challenge I can read."); }
  if (ch.method !== "tempo" || ch.intent !== "charge") throw new Reject(`It asks for ${ch.method} ${ch.intent}; I pay one-time Tempo charges.`);
  const q = ch.request as { amount: string; currency: string; recipient?: string; methodDetails?: { chainId?: number } };
  if ((q.methodDetails?.chainId ?? TEMPO.chainId) !== TEMPO.chainId) throw new Reject("It wants payment on a different Tempo network. Lexari's card pays on Tempo testnet only.");
  const tok = TEMPO_TOKENS.find((t) => t.address.toLowerCase() === q.currency.toLowerCase());
  if (!tok) throw new Reject("It asks for a coin my Tempo card doesn't hold.");
  return { ch, q, tok, usd: Number(BigInt(q.amount)) / 10 ** tok.decimals };
}

export const cardMpp: ToolDef = {
  name: "card.mpp", connector: "tempo", risk: "sign", input: mppIn,
  hint: 'card.mpp {"url":"https://api.example.com/paid","method":"GET"} : pay for an API or resource that charges over MPP (HTTP 402) with your Tempo card. The person confirms the exact charge first.',
  prepare: async (i: never, agent: AgentRef, limits: GrantLimits): Promise<Prepared> => {
    const p = i as z.infer<typeof mppIn>;
    const { ch, q, tok, usd } = await challengeOf(p.url, p.method, p.body);
    if (usd > limits.perTxUsd) throw new Reject(`That's $${usd.toFixed(2)}, over your $${limits.perTxUsd} per payment limit for Tempo.`);
    const no = await cardRefusal(agent.userId, agent.slug, Math.round(usd * 1e6));
    if (no) throw new Reject(`I can't pay that: ${no}.`);
    const host = new URL(p.url).host;
    return {
      title: `Pay ${usd} ${tok.symbol} to ${host}`, chain: "tempo", usdMicros: Math.round(usd * 1e6), summary: `MPP payment to ${host}`,
      plan: { kind: "mpp", url: p.url, method: p.method, body: p.body, amount: q.amount, currency: q.currency, recipient: q.recipient } satisfies MppPlan,
      rows: [["For", ch.description || `${p.method} ${host}${new URL(p.url).pathname}`], ["Pay", `${usd} ${tok.symbol}`], ["To", short(q.recipient)], ["How", "Machine Payments Protocol (MPP), one-time charge"], ["Card", "Your agent's Tempo card"], ["Network", TEMPO.network]],
    };
  },
  execute: async (pl: never, agent: AgentRef): Promise<Executed> => {
    const p = pl as MppPlan;
    if (p.kind !== "mpp") throw new Reject("That payment can't run any more.");
    const r = await fetch(p.url, { method: p.method, body: p.body, headers: p.body ? { "content-type": "application/json" } : undefined, signal: AbortSignal.timeout(15_000), redirect: "manual" });
    if (r.status !== 402) throw new Reject(`The resource stopped asking for payment (HTTP ${r.status}). Nothing was paid.`);
    const now = Challenge.fromResponse(r).request as { amount: string; currency: string; recipient?: string };
    if (BigInt(now.amount) > BigInt(p.amount) || now.currency.toLowerCase() !== p.currency.toLowerCase() || (now.recipient || "").toLowerCase() !== (p.recipient || "").toLowerCase()) throw new Reject("The price or payee changed since you saw the card. Nothing was paid.");
    const account = privateKeyToAccount(`0x${Buffer.from(evmKey(agent.userId, agent.slug)).toString("hex")}`);
    const mppx = Mppx.create({ polyfill: false, methods: [tempo.charge({ account })] });
    const credential = await mppx.createCredential(r, { account });
    const paid = await fetch(p.url, { method: p.method, body: p.body, headers: { Authorization: credential, ...(p.body ? { "content-type": "application/json" } : {}) }, signal: AbortSignal.timeout(30_000) });
    const receipt = paid.headers.get("payment-receipt") || "";
    const text = (await paid.text().catch(() => "")).slice(0, 400);
    if (!paid.ok) throw new Reject(`The merchant answered HTTP ${paid.status} after payment was offered.`);
    return { sig: receipt.slice(0, 120) || "mpp", confirmed: true, rows: [["Paid", `${p.url}`], ["Got", text || `HTTP ${paid.status}`]] };
  },
};
