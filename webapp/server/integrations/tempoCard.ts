/**
 * card.pay: the agent pays with its Tempo card. It spends the agent's Tempo testnet stablecoins (TIP-20, fees paid in
 * the same coin), inside the card's per payment and daily limits and your Tempo grant limits. Never auto: it always
 * prepares a Confirm card, and the card being frozen stops it both when preparing and again right before sending.
 */
import { z } from "zod";
import { cardRefusal } from "../agentpay/tempoCard";
import { evmAddress, evmKey } from "./evm";
import { TEMPO, TEMPO_TOKENS, TempoError, tempoBalances, tempoToken, tempoTransfer } from "./tempo";
import { Reject } from "./reject";
import type { AgentRef, Executed, GrantLimits, Prepared, ToolDef } from "./registry";

const num = z.union([z.number(), z.string().regex(/^\s*\$?\d+(\.\d+)?\s*$/).transform((s) => Number(s.replace(/[$\s]/g, "")))]);
const payIn = z.object({ to: z.string().regex(/^0x[0-9a-fA-F]{40}$/), amount: num, merchant: z.string().trim().min(1).max(60), memo: z.string().max(120).optional(), token: z.string().max(12).default("pathUSD") }).passthrough();
type PayPlan = { kind: "tempo-card"; to: string; token: string; symbol: string; atoms: string; amount: number; merchant: string };
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (n: number) => (+n.toFixed(6)).toLocaleString("en-US", { maximumFractionDigits: 6 });

export const cardPay: ToolDef = {
  name: "card.pay", connector: "tempo", risk: "sign", input: payIn,
  hint: 'card.pay {"merchant":"Acme API","to":"0x…","amount":3,"token":"pathUSD","memo":"one month"} : pay a merchant with your Tempo card (your Tempo stablecoins, inside the card limits); the person always confirms it.',
  prepare: async (i: never, agent: AgentRef, limits: GrantLimits): Promise<Prepared> => {
    const p = i as z.output<typeof payIn>;
    const t = tempoToken(p.token);
    if (!t) throw new Reject(`My Tempo card pays in ${TEMPO_TOKENS.map((x) => x.symbol).join(" or ")}.`);
    if (!(p.amount > 0)) throw new Reject("The amount has to be more than 0.");
    const amount = Math.round(p.amount * 1e6) / 1e6;
    const micros = Math.round(amount * 1e6);
    if (amount > limits.perTxUsd) throw new Reject(`That's $${amount.toFixed(2)}, over your $${limits.perTxUsd} per payment limit for Tempo.`);
    const no = await cardRefusal(agent.userId, agent.slug, micros);
    if (no) throw new Reject(`I can't pay that: ${no}.`);
    const from = evmAddress(agent.userId, agent.slug);
    if (p.to.toLowerCase() === from.toLowerCase()) throw new Reject("That's my own card address.");
    const bal = (await tempoBalances(from)).find((x) => x.address === t.address);
    if (!bal || bal.amount < amount + 0.01) throw new Reject(`My Tempo card holds ${fmt(bal?.amount || 0)} ${t.symbol}, and the fee is paid in it too. Ask me to use the Tempo faucet first.`);
    return {
      title: `Pay ${p.merchant.slice(0, 40)} ${fmt(amount)} ${t.symbol} with my Tempo card`, chain: "tempo", usdMicros: micros, summary: `Tempo card payment to ${p.merchant.slice(0, 40)}`,
      rows: [["Merchant", p.merchant.slice(0, 60)], ["Amount", `${fmt(amount)} ${t.symbol} (test)`], ...(p.memo ? [["Memo", p.memo.slice(0, 120)] as [string, string]] : []), ["Pays to", short(p.to)], ["Card", `${agent.name}'s Tempo card`], ["Network", TEMPO.network]],
      plan: { kind: "tempo-card", to: p.to, token: t.address, symbol: t.symbol, atoms: String(Math.round(amount * 10 ** t.decimals)), amount, merchant: p.merchant.slice(0, 60) } satisfies PayPlan,
    };
  },
  execute: async (pl: never, agent: AgentRef): Promise<Executed> => {
    const p = pl as PayPlan;
    if (p.kind !== "tempo-card") throw new Reject("That payment can't run any more.");
    const no = await cardRefusal(agent.userId, agent.slug, 0);
    if (no) throw new Reject(`Not sent: ${no}.`);
    try {
      const r = await tempoTransfer(evmKey(agent.userId, agent.slug), evmAddress(agent.userId, agent.slug), p.token, p.to, BigInt(p.atoms));
      return { sig: r.hash, confirmed: r.confirmed, receipt: { amount: `${fmt(p.amount)} ${p.symbol}`, label: p.merchant, net: TEMPO.network, url: TEMPO.explorerTx(r.hash) } };
    } catch (e) { if (e instanceof TempoError) throw new Reject(e.message); throw e; }
  },
};
