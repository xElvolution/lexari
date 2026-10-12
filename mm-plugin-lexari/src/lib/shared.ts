import type { PluginCommandContext } from "@metamask/agent-wallet/plugin";

export const MONAD_TESTNET = 10143;
export const MONAD = 143;
/** Agora AUSD (https://docs.agora.finance/developer/contract-deployments). */
export const AUSD: Record<number, `0x${string}`> = {
  [MONAD]: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
  [MONAD_TESTNET]: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
};
export const isAddr = (s: string): s is `0x${string}` => /^0x[0-9a-fA-F]{40}$/.test(s);
export const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
/** ERC-20 transfer(to, amount) calldata. */
export const transferData = (to: string, atoms: bigint) => `0xa9059cbb${pad(to)}${pad(atoms.toString(16))}` as `0x${string}`;
export const atoms = (n: string, d: number) => { const [w, f = ""] = n.split("."); return BigInt(w || "0") * 10n ** BigInt(d) + BigInt((f + "0".repeat(d)).slice(0, d) || "0"); };

/** The active Agent Wallet EVM address. */
export async function activeAddress(ctx: PluginCommandContext): Promise<`0x${string}`> {
  const acc = ctx.accountService as unknown as { getSelectedWallet?: (s: unknown, ns: string) => Promise<{ address: string }> };
  const st = await (ctx.walletStateManager as unknown as { read: () => unknown }).read();
  const w = await acc.getSelectedWallet?.(st, "evm");
  if (!w || !isAddr(w.address)) throw new Error("No EVM wallet is selected in Agent Wallet. Run mm wallet setup first.");
  return w.address;
}

/** Submit one EVM transaction through the Agent Wallet executor (the user approves it in Agent Wallet). */
export async function submit(ctx: PluginCommandContext, io: Parameters<PluginCommandContext["walletExecutor"]>[0], id: string, chainId: number, tx: { to: `0x${string}`; data?: `0x${string}`; value?: string }) {
  const run = await ctx.walletExecutor(io, id);
  const r = (await (run as unknown as (req: unknown, o: unknown) => Promise<{ kind: string; hash?: string; status?: string; failureDescription?: string }>)({ kind: "transaction", chainId, transaction: { to: tx.to, data: tx.data ?? "0x", value: tx.value ?? "0x0" } }, { signal: (io as { signal?: AbortSignal }).signal }));
  return { status: r.status, hash: r.hash, failureReason: r.failureDescription };
}
