import QR from "qrcode";
import { z } from "zod";
import { CHAINS, RAILS, TOPUP_MIN_USD, coinById, railId } from "@/content/topup";
import { chainLogoSrc, coinLogoSrc } from "@/lib/logos";
import { jsonError, rateLimit, readJson } from "@/server/http";
import { withUser } from "@/server/route";
import { intentsDepositQuote, intentsReady, intentsTokens } from "@/server/integrations/intents";
import { chainName, depositCoins } from "@/server/integrations/deposit";
import { depositInfo } from "@/server/topup/deposits";
import { evmDepositAddress, solDepositAddress } from "@/server/topup/derive";

export const runtime = "nodejs";
const noStore = { "cache-control": "no-store" };

/** Every coin Aurora Intents routes, for Top up > Pay with crypto (logos and chains). */
export const GET = withUser(async () => {
  const coins = intentsReady() ? await depositCoins().catch(() => []) : [];
  // Lexari's own deposit networks, for the phone app (the web reads them from content/topup.ts).
  const rails = RAILS.filter((r) => !r.hidden && r.live && CHAINS[r.chain].live).map((r) => ({
    key: railId(r), coin: r.coin, symbol: coinById(r.coin)?.symbol || r.coin, name: coinById(r.coin)?.name || r.coin, chain: r.chain, chainName: CHAINS[r.chain].name,
    network: CHAINS[r.chain].network, family: CHAINS[r.chain].family, chainId: CHAINS[r.chain].chainId ?? null, token: r.token ?? null, decimals: r.decimals, tag: !!r.tag,
    logo: coinLogoSrc(r.coin), chainLogo: chainLogoSrc(r.chain),
  }));
  return Response.json({
    ready: intentsReady(), rails, min: TOPUP_MIN_USD,
    coins: coins.map((c) => ({ ...c, chains: c.chains.filter((x) => !x.direct).map((x) => ({ assetId: x.assetId, chain: x.chain, chainName: chainName(x.chain), decimals: x.decimals })) })).filter((c) => c.chains.length),
  }, { headers: noStore });
});

const body = z.object({ assetId: z.string().min(3).max(200), usd: z.coerce.number().min(TOPUP_MIN_USD).max(5000) }).strict();

/**
 * A one-time Aurora Intents deposit address for topping up your balance with any coin. Aurora converts what you send
 * to USDC and delivers it to YOUR Lexari deposit address on Solana, which the deposit watcher credits to your balance
 * once it's final (exactly once; server/topup/deposits.ts). If the swap can't complete, Aurora refunds.
 */
export const POST = withUser(async (user, req) => {
  const b = await readJson(req, body);
  if (b instanceof Response) return b;
  if (!(await rateLimit(`topup:aurora:${user.userId}`, 60, 3_600_000))) return jsonError(429, "That's a lot of addresses. Wait a minute and try again.");
  if (!intentsReady()) return jsonError(503, "Topping up with this coin isn't open yet. Pick another coin.");
  const t = (await intentsTokens()).find((x) => x.assetId === b.assetId);
  if (!t || !(t.price > 0)) return jsonError(400, "That coin can't be priced right now. Pick another or try again.");
  const amount = +(b.usd / t.price).toFixed(Math.min(8, t.decimals));
  try {
    const me = solDepositAddress(user.userId);
    const q = await intentsDepositQuote(me, evmDepositAddress(user.userId), { assetId: t.assetId, decimals: t.decimals }, amount);
    await depositInfo(user.userId, "USDC:solmain").catch(() => null); // start watching where the USDC lands
    return Response.json({
      address: q.depositAddress, memo: q.depositMemo || null, amount, symbol: t.symbol, chain: chainName(t.blockchain),
      receive: q.amountOutFormatted, deadline: q.deadline || null, watch: "USDC:solmain",
      qr: await QR.toString(q.depositAddress, { type: "svg", margin: 1, width: 200 }),
    }, { headers: noStore });
  } catch (e) {
    return jsonError(400, e instanceof Error ? e.message.replace(/^Aurora Intents said: /, "") : "Couldn't get an address for that coin.");
  }
});
