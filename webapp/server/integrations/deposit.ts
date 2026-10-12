/**
 * Deposit coin picker, sourced live from Aurora Intents Connect (GET /api/v1/supported_tokens). Any listed coin can be
 * sent to a one-time Aurora Intents deposit address; Aurora Intents converts it to USDC in the agent's balance on
 * Solana. Logos come from CoinGecko by each token's coingeckoId, with a monogram fallback in the UI.
 * Deposit addresses come from an Aurora Intents Swap API quote, so they need AURORA_INTENTS_API_KEY.
 */
import QR from "qrcode";
import { intentsReady, intentsDepositQuote, intentsTokens } from "./intents";

const CONNECT = () => (process.env.AURORA_INTENTS_CONNECT_URL || "https://intents-connect-api.aurora.dev").replace(/\/+$/, "");
type Raw = { assetId: string; symbol: string; blockchain: string; decimals: number; price: number; coingeckoId?: string; contractAddress?: string };
export type DepositChain = { assetId: string; chain: string; decimals: number };
export type DepositCoin = { symbol: string; name: string; price: number; logo: string | null; chains: DepositChain[] };
const CHAIN_NAME: Record<string, string> = { xrp: "XRP Ledger", doge: "Dogecoin", ltc: "Litecoin", bch: "Bitcoin Cash", cardano: "Cardano", aptos: "Aptos", starknet: "Starknet", aleo: "Aleo", movement: "Movement", dash: "Dash", zec: "Zcash", abs: "Abstract", adi: "ADI", fogo: "Fogo", hood: "Robinhood Chain", eth: "Ethereum", sol: "Solana", base: "Base", arb: "Arbitrum", op: "Optimism", pol: "Polygon", bsc: "BNB Chain", avax: "Avalanche", near: "NEAR", monad: "Monad", tron: "Tron", ton: "TON", gnosis: "Gnosis", stellar: "Stellar", bera: "Berachain", scroll: "Scroll", xlayer: "X Layer", plasma: "Plasma", btc: "Bitcoin", hypercore: "Hyperliquid", sui: "Sui" };
export const chainName = (c: string) => CHAIN_NAME[c] || c;
const EXTRA_CG: Record<string, string> = { BTC: "bitcoin", XRP: "ripple", DOGE: "dogecoin", LTC: "litecoin", BCH: "bitcoin-cash", ADA: "cardano", APT: "aptos", SUI: "sui", TON: "the-open-network", DASH: "dash", STRK: "starknet", ALEO: "aleo", MOVE: "movement", ETH: "ethereum", SOL: "solana", BNB: "binancecoin", MON: "monad", USDC: "usd-coin", USDT: "tether", TRX: "tron", XLM: "stellar", ZEC: "zcash", NEAR: "near", AVAX: "avalanche-2", POL: "polygon-ecosystem-token", HYPE: "hyperliquid" };
let cache: { at: number; coins: DepositCoin[] } | null = null;

export async function depositCoins(): Promise<DepositCoin[]> {
  if (cache && Date.now() - cache.at < 600_000) return cache.coins;
  const r = await fetch(`${CONNECT()}/api/v1/supported_tokens`, { signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`Aurora Intents Connect said HTTP ${r.status}`);
  const connect = ((await r.json()) as { result: { in: Raw[] } }).result.in;
  // With the API key, the Aurora Intents Swap API token list is the live source (it is wider: native BTC, XRP, DOGE…).
  // Connect's list still supplies CoinGecko ids for logos.
  const cg = new Map<string, string>(Object.entries(EXTRA_CG));
  for (const t of connect) if (t.coingeckoId) cg.set(t.symbol.toUpperCase(), t.coingeckoId);
  const live = intentsReady() ? await intentsTokens().catch(() => null) : null;
  const src: Raw[] = live?.length ? live.map((t) => ({ ...t, coingeckoId: cg.get(t.symbol.toUpperCase()) })) : connect;
  const all = src.filter((t) => !/deprecated|test/i.test(t.symbol));
  const ids = [...new Set(all.map((t) => t.coingeckoId).filter(Boolean))] as string[];
  const meta = new Map<string, { image: string; name: string }>();
  for (let i = 0; i < ids.length; i += 200) {
    const m = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=250&ids=${ids.slice(i, i + 200).join(",")}`, { signal: AbortSignal.timeout(12_000) }).then((x) => (x.ok ? x.json() : []), () => []) as { id: string; image: string; name: string }[];
    for (const c of m) meta.set(c.id, { image: c.image, name: c.name });
  }
  const by = new Map<string, DepositCoin>();
  for (const t of all) {
    const k = t.symbol.toUpperCase();
    const m = t.coingeckoId ? meta.get(t.coingeckoId) : undefined;
    const c = by.get(k) || { symbol: t.symbol, name: m?.name || t.symbol, price: t.price, logo: m?.image || null, chains: [] };
    if (!c.logo && m?.image) c.logo = m.image;
    c.chains.push({ assetId: t.assetId, chain: t.blockchain, decimals: t.decimals });
    by.set(k, c);
  }
  const rank = ["USDC", "USDT", "ETH", "BTC", "SOL", "WBTC", "BNB", "MON", "NEAR", "USDT0", "AVAX", "TRX", "XLM", "ZEC", "ARB", "OP", "POL", "DAI", "XAUT"];
  const coins = [...by.values()].sort((a, b) => ((rank.indexOf(a.symbol.toUpperCase()) + 1 || 99) - (rank.indexOf(b.symbol.toUpperCase()) + 1 || 99)) || a.symbol.localeCompare(b.symbol));
  cache = { at: Date.now(), coins };
  return coins;
}

/** A one-time deposit address for `amount` of the coin on `chain`. Aurora Intents converts it to USDC on Solana. */
export async function depositAddress(recipient: string, assetId: string, amount: number) {
  const coins = await depositCoins();
  const coin = coins.find((c) => c.chains.some((x) => x.assetId === assetId));
  const ch = coin?.chains.find((x) => x.assetId === assetId);
  if (!coin || !ch) throw new Error("Aurora Intents doesn't take that coin.");
  if (!intentsReady()) return { ready: false as const, coin: coin.symbol, chain: chainName(ch.chain) };
  const q = await intentsDepositQuote(recipient, ch, amount);
  return { ready: true as const, coin: coin.symbol, chain: chainName(ch.chain), address: q.depositAddress, memo: q.depositMemo || null, receive: q.amountOutFormatted, deadline: q.deadline || null, qr: await QR.toString(q.depositAddress, { type: "svg", margin: 1, width: 180 }) };
}
