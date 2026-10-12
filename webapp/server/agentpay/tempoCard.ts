/**
 * The agent's Tempo card: a spending card that runs on Tempo testnet. Its balance is the agent's Tempo stablecoins
 * (pathUSD, AlphaUSD), its limits are per payment and per day (UTC), and you can freeze it. A card payment is the
 * `card.pay` tool: it always prepares a Confirm card and only your Confirm sends the TIP-20 payment. Spending is
 * summed from integration_actions (tool "card.pay").
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { tempoCards } from "../db/tempoCardSchema";
import { integrationActions } from "../db/integrationsSchema";
import { COUNTED } from "../integrations/grants";

export const CARD_DEFAULT = { perTxMicros: 5_000_000, dailyMicros: 20_000_000, frozen: false };
export const CARD_LIMITS = { perTxMaxUsd: 100, dailyMaxUsd: 500 };
const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

export async function tempoCardOf(userId: string, slug: string) {
  const [c] = await db().select().from(tempoCards).where(and(eq(tempoCards.userId, userId), eq(tempoCards.agentSlug, slug))).limit(1);
  return { perTxMicros: c?.perTxMicros ?? CARD_DEFAULT.perTxMicros, dailyMicros: c?.dailyMicros ?? CARD_DEFAULT.dailyMicros, frozen: c?.frozen ?? false };
}

export async function cardSpentToday(userId: string, slug: string) {
  const [r] = await db().select({ v: sql<string>`coalesce(sum(${integrationActions.usdMicros}), 0)` }).from(integrationActions)
    .where(and(eq(integrationActions.userId, userId), eq(integrationActions.agentSlug, slug), inArray(integrationActions.tool, ["card.pay", "card.mpp"]), inArray(integrationActions.status, [...COUNTED]), gte(integrationActions.createdAt, startOfUtcDay())));
  return Number(r?.v || 0);
}

export async function cardHistory(userId: string, slug: string, limit = 12) {
  return db().select().from(integrationActions).where(and(eq(integrationActions.userId, userId), eq(integrationActions.agentSlug, slug), eq(integrationActions.tool, "card.pay"))).orderBy(desc(integrationActions.createdAt)).limit(limit);
}

export async function setTempoCard(userId: string, slug: string, v: { perTxUsd: number; dailyUsd: number; frozen: boolean }) {
  const perTxMicros = Math.round(Math.max(0, Math.min(CARD_LIMITS.perTxMaxUsd, v.perTxUsd)) * 1e6);
  const dailyMicros = Math.max(perTxMicros, Math.round(Math.max(0, Math.min(CARD_LIMITS.dailyMaxUsd, v.dailyUsd)) * 1e6));
  await db().insert(tempoCards).values({ userId, agentSlug: slug, perTxMicros, dailyMicros, frozen: v.frozen })
    .onConflictDoUpdate({ target: [tempoCards.userId, tempoCards.agentSlug], set: { perTxMicros, dailyMicros, frozen: v.frozen, updatedAt: new Date() } });
  return { perTxMicros, dailyMicros, frozen: v.frozen };
}

/** null when the payment fits the card, otherwise why it can't be made. */
export async function cardRefusal(userId: string, slug: string, micros: number) {
  const c = await tempoCardOf(userId, slug);
  const usd = (m: number) => `$${(m / 1e6).toFixed(2)}`;
  if (c.frozen) return "my Tempo card is frozen. Unfreeze it on my page first";
  if (micros > c.perTxMicros) return `${usd(micros)} is over my card's ${usd(c.perTxMicros)} per payment limit`;
  const spent = await cardSpentToday(userId, slug);
  if (spent + micros > c.dailyMicros) return `that would take my card to ${usd(spent + micros)} today, over its ${usd(c.dailyMicros)} daily limit`;
  return null;
}
