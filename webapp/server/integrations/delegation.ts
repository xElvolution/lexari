/**
 * MetaMask Delegation (ERC-7710) on Monad testnet, through @metamask/smart-accounts-kit.
 * You delegate from your MetaMask smart account to an agent's EVM address with caveats (a MON cap and an expiry),
 * signed in MetaMask in your browser. The agent never holds your funds: when you confirm a send, the agent's own key
 * redeems the delegation at the DelegationManager, which checks every caveat on chain and moves MON out of YOUR smart
 * account. The agent pays the gas in its own test MON. `metamask.send` always waits for your Confirm.
 */
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { createPublicClient, createWalletClient, http, parseEther, formatEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db } from "../db";
import { agentDelegations } from "../db/delegationSchema";
import { evmAddress, evmKey } from "./evm";
import { MONAD, monBalance } from "./monad";
import { walletsOf } from "../wallets";
import { Reject } from "./reject";
import type { AgentRef, Executed, Prepared, ToolDef } from "./registry";

export const monadChain = {
  id: MONAD.chainId, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD.rpc()] } }, blockExplorers: { default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" } }, testnet: true,
} as const;

export async function liveDelegation(userId: string, slug: string) {
  const [d] = await db().select().from(agentDelegations).where(and(eq(agentDelegations.userId, userId), eq(agentDelegations.agentSlug, slug), isNull(agentDelegations.revokedAt))).orderBy(desc(agentDelegations.createdAt)).limit(1);
  if (!d || d.expiresAt.getTime() <= Date.now()) return null;
  return d;
}

const sendIn = z.object({ to: z.string().regex(/^0x[0-9a-fA-F]{40}$/), amount: z.coerce.number().positive() }).passthrough();
type SendPlan = { kind: "mm-delegation"; id: string; to: string; wei: string; amount: number };

const status: ToolDef = {
  name: "metamask.delegation", connector: "metamask", risk: "read", input: z.object({}).passthrough(),
  hint: "metamask.delegation {} : whether the person delegated MON to you from their MetaMask smart account on Monad testnet, and how much is left.",
  run: async (_i: never, agent: AgentRef) => {
    const d = await liveDelegation(agent.userId, agent.slug);
    if (!d) return { summary: "Checked its MetaMask delegation", text: "No live MetaMask delegation to me. The person can create one in Settings > Wallets > MetaMask delegation." };
    const left = BigInt(d.maxWei) - BigInt(d.spentWei);
    const bal = await monBalance(d.delegator).catch(() => null);
    return { summary: "Checked its MetaMask delegation", text: `MetaMask delegation on Monad testnet from smart account ${d.delegator}: up to ${formatEther(BigInt(d.maxWei))} MON, ${formatEther(left)} left, until ${d.expiresAt.toISOString().slice(0, 10)}. The smart account holds ${bal === null ? "an unknown amount of" : bal} MON. Sends only go to the person's linked wallets and always need their Confirm.` };
  },
};

const send: ToolDef = {
  name: "metamask.send", connector: "metamask", risk: "sign", input: sendIn,
  hint: 'metamask.send {"to":"0x…","amount":0.1} : prepare a MON send from the person\'s MetaMask smart account under their delegation to you (Monad testnet), only to one of their linked wallets; they confirm it.',
  prepare: async (i: never, agent: AgentRef): Promise<Prepared> => {
    const p = i as z.output<typeof sendIn>;
    const d = await liveDelegation(agent.userId, agent.slug);
    if (!d) throw new Reject("There's no live MetaMask delegation to me. Create one in Settings > Wallets first.");
    const linked = (await walletsOf(agent.userId)).wallets.filter((w) => w.family === "evm").map((w) => w.address.toLowerCase());
    if (!linked.includes(p.to.toLowerCase())) throw new Reject("Delegated MON can only go to one of your linked EVM wallets.");
    const wei = parseEther(String(p.amount));
    const left = BigInt(d.maxWei) - BigInt(d.spentWei);
    if (wei > left) throw new Reject(`That's over what's left on the delegation (${formatEther(left)} MON).`);
    const bal = await monBalance(d.delegator);
    if (bal < p.amount) throw new Reject(`Your smart account holds ${bal} MON, less than ${p.amount}.`);
    const gas = await monBalance(evmAddress(agent.userId, agent.slug));
    if (gas <= 0) throw new Reject(`My Monad wallet (${evmAddress(agent.userId, agent.slug)}) needs a little test MON for gas first.`);
    return {
      title: `Send ${p.amount} MON from your smart account`, chain: "monad", usdMicros: 0, summary: `Delegated MON send`,
      rows: [["Send", `${p.amount} MON (test)`], ["From", `Your MetaMask smart account ${d.delegator.slice(0, 6)}…${d.delegator.slice(-4)}`], ["To", `${p.to.slice(0, 6)}…${p.to.slice(-4)} (linked)`], ["Left after", `${formatEther(left - wei)} MON`], ["Checked by", "MetaMask DelegationManager caveats"], ["Network", MONAD.network]],
      plan: { kind: "mm-delegation", id: d.id, to: p.to, wei: wei.toString(), amount: p.amount } satisfies SendPlan,
    };
  },
  execute: async (pl: never, agent: AgentRef): Promise<Executed> => {
    const p = pl as SendPlan;
    if (p.kind !== "mm-delegation") throw new Reject("That send can't run any more.");
    const d = await liveDelegation(agent.userId, agent.slug);
    if (!d || d.id !== p.id) throw new Reject("The delegation was revoked or expired. Nothing was sent.");
    if (BigInt(p.wei) > BigInt(d.maxWei) - BigInt(d.spentWei)) throw new Reject("That's over what's left on the delegation. Nothing was sent.");
    const { contracts, createExecution, ExecutionMode, getSmartAccountsEnvironment } = await import("@metamask/smart-accounts-kit");
    const env = getSmartAccountsEnvironment(MONAD.chainId);
    const data = contracts.DelegationManager.encode.redeemDelegations({
      delegations: [[d.delegation as never]], modes: [ExecutionMode.SingleDefault], executions: [[createExecution({ target: p.to as Hex, value: BigInt(p.wei) })]],
    });
    const account = privateKeyToAccount(`0x${Buffer.from(evmKey(agent.userId, agent.slug)).toString("hex")}`);
    const wallet = createWalletClient({ account, chain: monadChain, transport: http(MONAD.rpc()) });
    const pub = createPublicClient({ chain: monadChain, transport: http(MONAD.rpc()) });
    let hash: Hex;
    try { hash = await wallet.sendTransaction({ to: env.DelegationManager as Hex, data }); }
    catch (e) { throw new Reject(`The DelegationManager refused it: ${(e as Error).message.split("\n")[0].slice(0, 160)}`); }
    const rc = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 }).catch(() => null);
    if (rc?.status === "success") await db().update(agentDelegations).set({ spentWei: (BigInt(d.spentWei) + BigInt(p.wei)).toString() }).where(eq(agentDelegations.id, d.id));
    if (rc && rc.status !== "success") throw new Reject(`The send reverted on chain (tx ${hash}).`);
    return { sig: hash, confirmed: rc?.status === "success", receipt: { amount: `${p.amount} MON`, label: `${p.to.slice(0, 6)}…${p.to.slice(-4)}`, net: MONAD.network, url: `https://testnet.monadexplorer.com/tx/${hash}` } };
  },
};

export const DELEGATION_TOOLS: ToolDef[] = [status, send];
