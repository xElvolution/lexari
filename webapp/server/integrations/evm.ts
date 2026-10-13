/**
 * EVM side of an agent: one address per agent (the same on every EVM chain), derived from SESSION_SECRET per
 * (person, agent) like its Solana wallet, so no key is stored. Agents read and send on Base Sepolia, Ethereum
 * Sepolia, Arbitrum Sepolia, Robinhood Chain testnet and Monad testnet; see evmchains.ts for sends and uniswap.ts for swaps.
 */
import { createHmac } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { HttpError } from "../http";

export type EvmChain = "base" | "ethereum" | "arbitrum" | "robinhood" | "monad";
export type EvmInfo = { name: string; network: string; chainId: number; rpc: () => string; usdc: string; native: string; explorer: string; txExplorer: string; testnet: true };
const alchemy = (sub: string) => (process.env.ALCHEMY_API_KEY ? `https://${sub}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : "");
/** Every EVM chain an agent can use. All are testnets: Lexari does not move real funds on EVM chains. */
export const EVM: Record<EvmChain, EvmInfo> = {
  base: { name: "Base", network: "Base Sepolia", chainId: 84532, rpc: () => process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org", usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", native: "ETH", explorer: "https://sepolia.basescan.org/address/", txExplorer: "https://sepolia.basescan.org/tx/", testnet: true },
  ethereum: { name: "Ethereum", network: "Sepolia", chainId: 11155111, rpc: () => process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com", usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", native: "ETH", explorer: "https://sepolia.etherscan.io/address/", txExplorer: "https://sepolia.etherscan.io/tx/", testnet: true },
  arbitrum: { name: "Arbitrum", network: "Arbitrum Sepolia", chainId: 421614, rpc: () => process.env.ARBITRUM_SEPOLIA_RPC || alchemy("arb-sepolia") || "https://sepolia-rollup.arbitrum.io/rpc", usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", native: "ETH", explorer: "https://sepolia.arbiscan.io/address/", txExplorer: "https://sepolia.arbiscan.io/tx/", testnet: true },
  robinhood: { name: "Robinhood Chain", network: "Robinhood Chain testnet", chainId: 46630, rpc: () => process.env.ROBINHOOD_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com", usdc: "", native: "ETH", explorer: "https://explorer.testnet.chain.robinhood.com/address/", txExplorer: "https://explorer.testnet.chain.robinhood.com/tx/", testnet: true },
  monad: { name: "Monad", network: "Monad testnet", chainId: 10143, rpc: () => process.env.MONAD_RPC || alchemy("monad-testnet") || "https://testnet-rpc.monad.xyz", usdc: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", native: "MON", explorer: "https://testnet.monadexplorer.com/address/", txExplorer: "https://testnet.monadexplorer.com/tx/", testnet: true },
};
export const isEvmChain = (s: string): s is EvmChain => Object.prototype.hasOwnProperty.call(EVM, s);
/** "base", "Base Sepolia", "arb", "robinhood chain" ... to a chain id, or null. */
export function evmChainOf(s: string): EvmChain | null {
  const k = s.trim().toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, EvmChain> = { base: "base", basesepolia: "base", ethereum: "ethereum", eth: "ethereum", sepolia: "ethereum", ethereumsepolia: "ethereum", arbitrum: "arbitrum", arb: "arbitrum", arbitrumsepolia: "arbitrum", robinhood: "robinhood", robinhoodchain: "robinhood", robinhoodchaintestnet: "robinhood", monad: "monad", monadtestnet: "monad" };
  return map[k] || null;
}

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

/** EIP-55 checksummed address for a 20-byte hex address. */
export function checksum(addr: string) {
  const a = addr.toLowerCase().replace(/^0x/, "");
  const h = hex(keccak_256(new TextEncoder().encode(a)));
  return `0x${[...a].map((ch, i) => (parseInt(h[i], 16) >= 8 ? ch.toUpperCase() : ch)).join("")}`;
}

/** The agent's EVM address. The key is derived on demand and never leaves the server. */
export function evmAddress(userId: string, slug: string) {
  return addressOfKey(evmKey(userId, slug));
}
/** The agent's EVM private key (server only; used to sign testnet transactions the person confirmed). */
export function evmKey(userId: string, slug: string): Uint8Array {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 16) throw new HttpError(503, "Agent wallets are not set up on this server.");
  return new Uint8Array(createHmac("sha256", s).update(`lexari-agent-wallet:v1:evm:${userId}:${slug}`).digest());
}
/** The Ethereum address of a 32-byte secp256k1 private key. */
export function addressOfKey(priv: Uint8Array) {
  const pub = secp256k1.getPublicKey(priv, false).subarray(1);
  return checksum(hex(keccak_256(pub).subarray(12)));
}

export async function rpc<T>(chain: EvmChain, method: string, params: unknown[]): Promise<T> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(EVM[chain].rpc(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      if (r.status === 429 || r.status >= 500) { last = `HTTP ${r.status}`; await new Promise((res) => setTimeout(res, 400 * 2 ** attempt)); continue; }
      const j = (await r.json()) as { result?: T; error?: { message: string } };
      if (j.error) throw new Error(j.error.message);
      return j.result as T;
    } catch (e) { last = (e as Error).message; await new Promise((res) => setTimeout(res, 400 * 2 ** attempt)); }
  }
  throw new Error(`${EVM[chain].network} didn't answer (${last})`);
}

/** Native ETH and test USDC held by an address on the chain's testnet. */
export async function evmBalances(chain: EvmChain, address: string) {
  const data = `0x70a08231${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
  const [wei, usdc] = await Promise.all([
    rpc<string>(chain, "eth_getBalance", [address, "latest"]),
    EVM[chain].usdc ? rpc<string>(chain, "eth_call", [{ to: EVM[chain].usdc, data }, "latest"]).catch(() => "0x0") : Promise.resolve("0x0"),
  ]);
  return { eth: Number(BigInt(wei)) / 1e18, usdc: Number(BigInt(usdc === "0x" ? "0x0" : usdc)) / 1e6 };
}
