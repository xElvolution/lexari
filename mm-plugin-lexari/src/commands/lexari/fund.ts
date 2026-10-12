import { type CommandIO, InputFieldType, type InputSchema, PluginCommand, schemaToArgs, schemaToFlags } from "@metamask/agent-wallet/plugin";
import { AUSD, MONAD_TESTNET, atoms, isAddr, submit, transferData } from "../../lib/shared.js";

const inputs = {
  agent: { type: InputFieldType.Text, flag: "agent", message: "Your Lexari agent's Monad address (0x…)", required: true, prompt: true, index: 0 },
  amount: { type: InputFieldType.Text, flag: "amount", message: "Amount", required: true, prompt: true, index: 1 },
  asset: { type: InputFieldType.Text, flag: "asset", message: "MON or AUSD", required: false, prompt: false },
  chainId: { type: InputFieldType.Text, flag: "chain-id", message: "Chain id (143 Monad, 10143 Monad testnet)", required: false, prompt: false },
} satisfies InputSchema;
type Out = { status?: string; hash?: string; failureReason?: string };

/** Fund a Lexari agent from your MetaMask Agent Wallet. Agent Wallet asks you to approve the transfer. */
export default class LexariFund extends PluginCommand<Out> {
  static override description = "Send MON or Agora AUSD from your Agent Wallet to one of your Lexari agents on Monad.";
  static override examples = ["<%= config.bin %> lexari fund 0xAgent 5 --asset AUSD"];
  static override flags = schemaToFlags(inputs);
  static override args = schemaToArgs(inputs);
  protected readonly pluginCommandId = "lexari:fund";
  async execute(io: CommandIO): Promise<Out> {
    const i = await io.resolveInputs(inputs);
    const to = String(i.agent), amount = String(i.amount), asset = String(i.asset || "MON").toUpperCase(), chainId = Number(i.chainId || MONAD_TESTNET);
    if (!isAddr(to)) throw new Error("The agent address must be a 0x address.");
    if (!(Number(amount) > 0)) throw new Error("The amount must be more than 0.");
    if (asset === "AUSD") return submit(this.ctx, io, "lexari:fund", chainId, { to: AUSD[chainId], data: transferData(to, atoms(amount, 6)) });
    if (asset !== "MON") throw new Error("Fund with MON or AUSD.");
    return submit(this.ctx, io, "lexari:fund", chainId, { to, value: `0x${atoms(amount, 18).toString(16)}` });
  }
  override successHint(d: Out) { return d.hash ? `Sent. Transaction ${d.hash}` : `Status: ${d.status ?? "unknown"}`; }
}
