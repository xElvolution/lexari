import { type CommandIO, InputFieldType, type InputSchema, PluginCommand, schemaToArgs, schemaToFlags } from "@metamask/agent-wallet/plugin";
import { AUSD, MONAD_TESTNET, activeAddress, isAddr } from "../../lib/shared.js";

const inputs = {
  chainId: { type: InputFieldType.Text, flag: "chain-id", message: "Chain id (143 Monad, 10143 Monad testnet)", required: false, prompt: false },
  address: { type: InputFieldType.Text, flag: "address", message: "Address to check (defaults to your wallet)", required: false, prompt: false, index: 0 },
} satisfies InputSchema;
type Out = { address: string; chainId: number; mon: string; ausd: string };

export default class LexariBalance extends PluginCommand<Out> {
  static override description = "MON and Agora AUSD held by your wallet or a Lexari agent on Monad.";
  static override examples = ["<%= config.bin %> lexari balance", "<%= config.bin %> lexari balance 0xAgent --chain-id 10143"];
  static override flags = schemaToFlags(inputs);
  static override args = schemaToArgs(inputs);
  protected readonly pluginCommandId = "lexari:balance";
  async execute(io: CommandIO): Promise<Out> {
    const i = await io.resolveInputs(inputs);
    const chainId = Number(i.chainId || MONAD_TESTNET);
    const address = i.address && isAddr(String(i.address)) ? (String(i.address) as `0x${string}`) : await activeAddress(this.ctx);
    const c = this.ctx.publicClient(chainId);
    const [wei, raw] = await Promise.all([
      c.getBalance({ address }),
      c.readContract({ address: AUSD[chainId], abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "balanceOf", args: [address] }).catch(() => 0n),
    ]);
    return { address, chainId, mon: (Number(wei) / 1e18).toString(), ausd: (Number(raw) / 1e6).toString() };
  }
  override successHint(d: Out) { return `${d.address} holds ${d.mon} MON and ${d.ausd} AUSD on chain ${d.chainId}.`; }
}
