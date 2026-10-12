import { withUser } from "@/server/route";
import { noStore } from "@/server/http";
import { ownAgent, solanaKeypair } from "@/server/agentWallets";
import { db } from "@/server/db";
import { agents } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { evmAddress } from "@/server/integrations/evm";
import { balances } from "@/server/integrations/solana";
import { tempoBalances } from "@/server/integrations/tempo";
import { monBalance } from "@/server/integrations/monad";
import { spotUsd } from "@/server/integrations/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Part = { asset: string; amount: number; usd: number; where: string };
const settle = <T,>(p: Promise<T>) => p.then((v) => v, () => null);

/** The agent's ONE balance: a USD total with a per-asset breakdown. Where each part sits is a detail. */
export const GET = withUser(async (user, req) => {
  const slug = new URL(req.url).searchParams.get("agent") || "";
  await ownAgent(user.userId, slug);
  const [a] = await db().select({ kind: agents.kind }).from(agents).where(and(eq(agents.userId, user.userId), eq(agents.slug, slug))).limit(1);
  const kp = solanaKeypair(user.userId, slug, a?.kind || "home");
  const evm = evmAddress(user.userId, slug);
  const [sol, tempo, mon, solPx] = await Promise.all([settle(balances(kp.publicKey)), settle(tempoBalances(evm)), settle(monBalance(evm)), settle(spotUsd("SOL"))]);
  const parts: Part[] = [];
  if (sol) {
    parts.push({ asset: "USDC", amount: sol.usdc, usd: sol.usdc, where: "Solana (home)" });
    parts.push({ asset: "SOL", amount: sol.sol, usd: sol.sol * (solPx || 0), where: "Solana (home)" });
  }
  for (const t of tempo || []) parts.push({ asset: t.symbol, amount: t.amount, usd: t.amount, where: "Tempo" });
  if (mon !== null) parts.push({ asset: "MON", amount: mon, usd: 0, where: "Monad (test MON, no price)" });
  const byAsset = new Map<string, { asset: string; amount: number; usd: number; where: string[] }>();
  for (const p of parts) {
    const k = byAsset.get(p.asset) || { asset: p.asset, amount: 0, usd: 0, where: [] };
    k.amount += p.amount; k.usd += p.usd; if (p.amount > 0) k.where.push(p.where);
    byAsset.set(p.asset, k);
  }
  const assets = [...byAsset.values()].sort((x, y) => y.usd - x.usd);
  return Response.json({ totalUsd: assets.reduce((s, x) => s + x.usd, 0), assets, test: true, partial: !sol || !tempo || mon === null }, { headers: noStore });
});
