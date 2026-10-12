import { type CommandIO, InputFieldType, type InputSchema, PluginCommand, schemaToArgs, schemaToFlags } from "@metamask/agent-wallet/plugin";
import { activeAddress, atoms, isAddr, submit, transferData } from "../../lib/shared.js";

/**
 * Cross-chain trade through Aurora Intents (https://docs.intents.aurora.dev): swap a token on an EVM chain into any
 * token on any chain (for example ETH on Base into USDC on Solana for your Lexari agent). Gets a live quote, shows it,
 * and only sends the deposit after you approve it in Agent Wallet. Needs AURORA_INTENTS_API_KEY in the environment.
 */
const inputs = {
  from: { type: InputFieldType.Text, flag: "from", message: "Token to sell, e.g. USDC", required: true, prompt: true },
  fromChain: { type: InputFieldType.Text, flag: "from-chain", message: "Chain it's on, e.g. base", required: true, prompt: true },
  to: { type: InputFieldType.Text, flag: "to", message: "Token to buy, e.g. USDC", required: true, prompt: true },
  toChain: { type: InputFieldType.Text, flag: "to-chain", message: "Chain to receive on, e.g. sol", required: true, prompt: true },
  amount: { type: InputFieldType.Text, flag: "amount", message: "Amount to sell", required: true, prompt: true },
  recipient: { type: InputFieldType.Text, flag: "recipient", message: "Who receives (defaults to your wallet; use your Lexari agent's address)", required: false, prompt: false },
  dry: { type: InputFieldType.Boolean, flag: "dry", message: "Quote only", required: false, prompt: false },
} satisfies InputSchema;
type Tok = { assetId: string; symbol: string; blockchain: string; decimals: number; contractAddress?: string };
const CHAIN_ID: Record<string, number> = { eth: 1, base: 8453, arb: 42161, op: 10, pol: 137, bsc: 56, avax: 43114, monad: 143, gnosis: 100, bera: 80094 };
type Out = { quote: { amountIn: string; amountOut: string; depositAddress?: string; timeEstimate?: number }; status?: string; hash?: string };

export default class LexariTrade extends PluginCommand<Out> {
  static override description = "Trade any token across chains through Aurora Intents, signed by your Agent Wallet.";
  static override examples = ["<%= config.bin %> lexari trade --from USDC --from-chain base --to USDC --to-chain sol --amount 10 --recipient <agent solana address>"];
  static override flags = schemaToFlags(inputs);
  static override args = schemaToArgs(inputs);
  protected readonly pluginCommandId = "lexari:trade";
  async execute(io: CommandIO): Promise<Out> {
    const i = await io.resolveInputs(inputs);
    const key = process.env.AURORA_INTENTS_API_KEY;
    if (!key) throw new Error("Set AURORA_INTENTS_API_KEY (from studio.aurora.dev) to trade through Aurora Intents.");
    const base = (process.env.AURORA_INTENTS_URL || "https://intents-api.aurora.dev").replace(/\/+$/, "");
    const tokens = ((await (await fetch(`${base}/api/tokens/${key}`)).json()) as { tokens: Tok[] }).tokens;
    const find = (s: unknown, c: unknown) => tokens.find((t) => t.symbol.toUpperCase() === String(s).toUpperCase() && t.blockchain === String(c).toLowerCase());
    const a = find(i.from, i.fromChain), b = find(i.to, i.toChain);
    if (!a || !b) throw new Error("Aurora Intents doesn't route that pair.");
    const chainId = CHAIN_ID[a.blockchain];
    if (!chainId) throw new Error("Sell from an EVM chain your Agent Wallet holds.");
    const me = await activeAddress(this.ctx);
    const recipient = String(i.recipient || me);
    const dry = i.dry === true;
    const body = { dry, swapType: "EXACT_INPUT", depositType: "ORIGIN_CHAIN", slippageTolerance: 100, originAsset: a.assetId, destinationAsset: b.assetId, amount: atoms(String(i.amount), a.decimals).toString(), refundTo: me, refundType: "ORIGIN_CHAIN", recipient, recipientType: "DESTINATION_CHAIN", deadline: new Date(Date.now() + 30 * 60_000).toISOString() };
    const r = await fetch(`${base}/api/quote/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json()) as { message?: string; quote?: { amountInFormatted: string; amountOutFormatted: string; depositAddress?: string; amountIn: string; timeEstimate?: number } };
    if (!r.ok || !j.quote) throw new Error(`Aurora Intents said: ${j.message || r.status}`);
    const q = { amountIn: `${j.quote.amountInFormatted} ${a.symbol} on ${a.blockchain}`, amountOut: `${j.quote.amountOutFormatted} ${b.symbol} on ${b.blockchain}`, depositAddress: j.quote.depositAddress, timeEstimate: j.quote.timeEstimate };
    if (dry || !j.quote.depositAddress) return { quote: q };
    const dep = j.quote.depositAddress as `0x${string}`;
    if (!isAddr(dep)) throw new Error("Unexpected deposit address.");
    const native = !a.contractAddress || /^0x0{40}$/i.test(a.contractAddress);
    const sent = native
      ? await submit(this.ctx, io, "lexari:trade", chainId, { to: dep, value: `0x${BigInt(j.quote.amountIn).toString(16)}` })
      : await submit(this.ctx, io, "lexari:trade", chainId, { to: a.contractAddress as `0x${string}`, data: transferData(dep, BigInt(j.quote.amountIn)) });
    if (sent.hash) await fetch(`${base}/api/deposit/submit/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: sent.hash, depositAddress: dep }) }).catch(() => null);
    return { quote: q, status: sent.status, hash: sent.hash };
  }
  override successHint(d: Out) { return `${d.quote.amountIn} becomes about ${d.quote.amountOut}${d.hash ? `. Deposit ${d.hash}` : " (quote only)"}.`; }
}
