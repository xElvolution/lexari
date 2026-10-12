/**
 * Port of webapp/content/integrations.ts (scopes, expiry) and webapp/content/wallets.ts for the phone.
 * test/parity.test.ts keeps the copy and ids the same as the web.
 */
export type Scope = "read" | "trade" | "bet" | "withdraw" | "transfer";
export const SCOPE_INFO: Record<Scope, { title: string; body: string; risky?: boolean }> = {
  read: { title: "See balances and prices", body: "Read its wallet, positions and live market data. Nothing moves." },
  trade: { title: "Trade", body: "Swap or place orders from its own wallet, inside your limits, after you confirm." },
  bet: { title: "Take positions", body: "Open prediction market positions, inside your limits, after you confirm." },
  withdraw: { title: "Send to your linked wallets", body: "Move funds back to a wallet you linked in Settings > Wallets. Nowhere else." },
  transfer: { title: "Send to any address", body: "Pay an address you name in chat, after you confirm. Leave this off unless you need it.", risky: true },
};
const SCOPES: Record<string, Scope[]> = {
  solana: ["read", "withdraw", "transfer"],
  orca: ["read", "trade"],
  tempo: ["read", "trade", "withdraw", "transfer"],
  hyperliquid: ["read", "trade"],
  kuru: ["read", "trade"],
  metamask: ["read", "withdraw"],
  panta: ["read", "bet"],
  intents: ["read", "trade"],
  agora: ["read", "transfer"],
};
export const scopesOf = (id: string): Scope[] => SCOPES[id] ?? ["read"];
export const defaultScopes = (id: string): Scope[] => scopesOf(id).filter((s) => s !== "transfer");
export const EXPIRY_DAYS = [1, 7, 30, 90] as const;
export const DEFAULT_EXPIRY_DAYS = 30;
export const LIMITS = { perTx: { min: 1, max: 25, def: 5 }, daily: { min: 1, max: 100, def: 20 }, slippageBps: { min: 10, max: 500, def: 100 } } as const;

/** The catalog as the phone needs it: name, tile colour and whether it moves money. */
export const INTEGRATION_META: Record<string, { name: string; color: string; moves: boolean; trading?: boolean; chains: string; domain?: string; addable?: boolean }> = {
  solana: { name: "Solana", color: "#9945ff", moves: true, chains: "Solana" },
  orca: { name: "Orca", color: "#ffd15c", moves: true, trading: true, chains: "Solana" },
  jupiter: { name: "Jupiter", color: "#1e2b38", moves: false, chains: "Solana" },
  bridge: { name: "Cross-chain", color: "#5b2bff", moves: false, chains: "Many chains" },
  polymarket: { name: "Polymarket", color: "#2e5cff", moves: false, chains: "Polygon" },
  panta: { name: "Panta", color: "#0f9d76", moves: true, chains: "Solana" },
  base: { name: "Base", color: "#0052ff", moves: false, chains: "Base Sepolia" },
  ethereum: { name: "Ethereum", color: "#627eea", moves: false, chains: "Sepolia" },
  tempo: { name: "Tempo", color: "#0a0a0a", moves: true, chains: "Tempo" },
  prices: { name: "Market prices", color: "#f5a524", moves: false, chains: "Market data" },
  hyperliquid: { name: "Hyperliquid", color: "#50e3c2", moves: true, trading: true, chains: "Hyperliquid" },
  monad: { name: "Monad", color: "#836ef9", moves: false, chains: "Monad testnet" },
  nansen: { name: "Nansen", color: "#1a1a2e", moves: false, chains: "Many chains" },
  kuru: { name: "Kuru", color: "#ff6b35", moves: true, trading: true, chains: "Monad testnet" },
  metamask: { name: "MetaMask Delegation", color: "#f6851b", moves: true, chains: "Monad testnet" },
  intents: { name: "Aurora Intents", color: "#70d44b", moves: true, trading: true, chains: "Any chain" },
  agora: { name: "Agora AUSD", color: "#0b3d91", moves: true, chains: "Monad testnet" },
  alchemy: { name: "Alchemy", color: "#363ff9", moves: false, chains: "Monad testnet" },
  mera: { name: "Mera", color: "#111111", moves: false, chains: "Passkeys", addable: false },
  skr: { name: "SKR", color: "#14F1D9", moves: false, chains: "Solana", addable: false },
};
/** Each partner's site, for its logo. */
export const INTEGRATION_DOMAIN: Record<string, string> = { skr: "solanamobile.com", solana: "solana.com", orca: "orca.so", jupiter: "jup.ag", polymarket: "polymarket.com", panta: "panta.fi", base: "base.org", ethereum: "ethereum.org", tempo: "tempo.xyz", hyperliquid: "hyperliquid.xyz", monad: "monad.xyz", nansen: "nansen.ai", kuru: "kuru.io", metamask: "metamask.io", intents: "intents.aurora.dev", agora: "agora.finance", alchemy: "alchemy.com", mera: "category.xyz", prices: "coingecko.com" };

export type AddedIntegration = {
  id: string; connector: string; enabled: boolean; agents: string[]; perTxUsd: number; dailyUsd: number; maxSlippageBps: number;
  spentTodayUsd: number; scopes: Scope[]; expiresAt: number | null;
};
export type AuditRow = { id: string; connector: string; at: number; kind: string; title: string; agent?: string; usd?: number; detail?: string; explorer?: string };

export const AUDIT_LABEL: Record<string, [string, string, string]> = {
  consent: ["Allowed", "#137a3d", "check"], change: ["Changed", "#6b6b78", "edit"], revoke: ["Switched off", "#c53030", "stop"],
  expire: ["Expired", "#6b6b78", "clock"], remove: ["Removed", "#c53030", "trash"], read: ["Read", "#6b6b78", "eye"],
  confirmed: ["Confirmed", "#137a3d", "check"], pending: ["Waiting", "#8a6100", "clock"], denied: ["Blocked by a rule", "#c53030", "lock"],
  cancelled: ["Cancelled", "#6b6b78", "x"], failed: ["Failed", "#c53030", "x"],
};

export type WalletFamily = "solana" | "evm";
export const WALLET_CHAINS: { id: string; name: string; family: WalletFamily; network: string }[] = [
  { id: "solana", name: "Solana", family: "solana", network: "Devnet" },
  { id: "base", name: "Base", family: "evm", network: "Base Sepolia" },
  { id: "ethereum", name: "Ethereum", family: "evm", network: "Sepolia" },
  { id: "tempo", name: "Tempo", family: "evm", network: "Testnet" },
  { id: "hyperliquid", name: "Hyperliquid", family: "evm", network: "Testnet" },
  { id: "monad", name: "Monad", family: "evm", network: "Testnet" },
];
export const CHAIN_COLOR: Record<string, string> = { solana: "#9945ff", base: "#0052ff", ethereum: "#627eea", tempo: "#0a0a0a", hyperliquid: "#50e3c2", monad: "#836ef9" };
export type LinkedWallet = { address: string; family: WalletFamily; client: string; login?: boolean; verifiedAt: number };
export type WalletsReply = { wallets: LinkedWallet[]; active: { address: string; chain: string } | null };
const CLIENT_NAME: Record<string, string> = { phantom: "Phantom", solflare: "Solflare", backpack: "Backpack", metamask: "MetaMask", coinbase_wallet: "Coinbase Wallet", rainbow: "Rainbow", wallet_connect: "WalletConnect", privy: "Privy wallet", lexari: "Sign-in wallet", rabby_wallet: "Rabby" };
export const clientName = (c: string) => CLIENT_NAME[c] || (c ? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "Wallet");
export const CLIENT_COLOR: Record<string, string> = { phantom: "#ab9ff2", solflare: "#fc7227", backpack: "#e33e3f", metamask: "#f6851b", coinbase_wallet: "#0052ff", rabby_wallet: "#7084ff", privy: "#0a0a0a", lexari: "#5b2bff" };
