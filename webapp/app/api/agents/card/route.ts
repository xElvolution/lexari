import { z } from "zod";
import { jsonError, rateLimit, readJson } from "@/server/http";
import { withUser } from "@/server/route";
import { ownAgent } from "@/server/agentWallets";
import { CARD_LIMITS, cardHistory, cardSpentToday, setTempoCard, tempoCardOf } from "@/server/agentpay/tempoCard";
import { cardOf } from "@/server/integrations/cards";
import { evmAddress } from "@/server/integrations/evm";
import { TEMPO, tempoBalances } from "@/server/integrations/tempo";
import { logEvent, requireStepUp } from "@/server/security";

export const runtime = "nodejs";

async function view(userId: string, slug: string) {
  const address = evmAddress(userId, slug);
  const [c, spent, rows, bal] = await Promise.all([tempoCardOf(userId, slug), cardSpentToday(userId, slug), cardHistory(userId, slug), tempoBalances(address).catch(() => null)]);
  return {
    address, network: TEMPO.network, explorer: TEMPO.explorerAddr(address), frozen: c.frozen,
    perTxUsd: c.perTxMicros / 1e6, dailyUsd: c.dailyMicros / 1e6, spentTodayUsd: spent / 1e6, limits: CARD_LIMITS,
    balances: bal ? bal.map((b) => ({ symbol: b.symbol, amount: b.amount })) : null,
    history: rows.map((r) => { const k = cardOf(r); return { id: r.id, title: k.title, usd: k.usd, status: k.status, explorer: k.explorer, at: r.createdAt.getTime() }; }),
  };
}

/** An agent's Tempo card: balance, limits, frozen state and payment history. */
export const GET = withUser(async (user, req) => {
  const slug = new URL(req.url).searchParams.get("agent") || "";
  await ownAgent(user.userId, slug);
  return Response.json(await view(user.userId, slug));
});

const body = z.object({ agent: z.string().max(40), perTxUsd: z.number().min(0).max(CARD_LIMITS.perTxMaxUsd), dailyUsd: z.number().min(0).max(CARD_LIMITS.dailyMaxUsd), frozen: z.boolean() }).strict();
export const POST = withUser(async (user, req) => {
  const b = await readJson(req, body);
  if (b instanceof Response) return b;
  if (b.dailyUsd < b.perTxUsd) return jsonError(400, "The daily limit can't be lower than the per payment limit.");
  if (!(await rateLimit(`tempocard:${user.userId}`, 60, 3_600_000))) return jsonError(429, "Wait a minute and try again.");
  await ownAgent(user.userId, b.agent);
  const cur = await tempoCardOf(user.userId, b.agent);
  const raises = Math.round(b.perTxUsd * 1e6) > cur.perTxMicros || Math.round(b.dailyUsd * 1e6) > cur.dailyMicros || (cur.frozen && !b.frozen);
  if (raises) requireStepUp(user, "raise or unfreeze an agent's Tempo card");
  await setTempoCard(user.userId, b.agent, b);
  await logEvent(user, "tempo-card", `${b.agent}'s Tempo card: $${b.perTxUsd} a payment, $${b.dailyUsd} a day${b.frozen ? ", frozen" : ""}`);
  return Response.json(await view(user.userId, b.agent));
});
