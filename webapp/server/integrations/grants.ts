/**
 * Integrations a person added (integration_grants): which agents may use each one and its limits. Open to everyone:
 * adding, changing or removing one needs no linked account.
 */
import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { DEFAULT_EXPIRY_DAYS, EXPIRY_DAYS, INTEGRATIONS, LIMITS, defaultScopes, integrationById, scopesOf, type ActivityRow, type AddedIntegration, type AuditRow, type IntegrationId, type Scope } from "@/content/integrations";
import { db } from "../db";
import { agents } from "../db/schema";
import { integrationActions, integrationAudit, integrationGrants } from "../db/integrationsSchema";
import { HttpError } from "../http";
import { solanaKeypair } from "../agentWallets";
import { EVM, evmAddress, type EvmChain } from "./evm";
import { zcashAddress, zcashExplorer } from "./zcash";
import { TEMPO } from "./tempo";
import { HL_NETWORK, hlExplorer, revokeApiWallet } from "./hyperliquid";
import { addrExplorer } from "./solana";
import { cardOf } from "./cards";

export type Grant = typeof integrationGrants.$inferSelect;
export const COUNTED = ["submitting", "submitted", "confirmed"] as const;
const startOfUtcDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };

/** Dollars (micro) already used today (UTC) on one integration: actions being sent or sent. */
export async function spentToday(userId: string, connector: string, tx = db()): Promise<number> {
  const [r] = await tx.select({ v: sql<string>`coalesce(sum(${integrationActions.usdMicros}), 0)` }).from(integrationActions)
    .where(and(eq(integrationActions.userId, userId), eq(integrationActions.connector, connector), inArray(integrationActions.status, [...COUNTED]), gte(integrationActions.createdAt, startOfUtcDay())));
  return Number(r?.v || 0);
}

/** Your agents, for the picker: name (your nickname for it first) and kind. */
export async function teamOf(userId: string) {
  const rows = await db().select({ slug: agents.slug, kind: agents.kind, name: agents.name, meta: agents.meta }).from(agents).where(eq(agents.userId, userId));
  return rows.sort((a, b) => Number(b.slug === "home") - Number(a.slug === "home")).map((r) => ({ slug: r.slug, kind: r.kind, name: (r.meta as { nick?: string } | null)?.nick || r.name }));
}

const CHAIN_OF: Partial<Record<IntegrationId, "solana" | EvmChain | "tempo" | "hyperliquid" | "zcash" | "polygon">> = { solana: "solana", orca: "solana", base: "base", ethereum: "ethereum", arbitrum: "arbitrum", robinhood: "robinhood", monad: "monad", uniswap: "base", tempo: "tempo", panta: "solana", hyperliquid: "hyperliquid", zcash: "zcash", polymarket: "polygon" };

function addressesFor(userId: string, g: Grant, team: { slug: string; kind: string }[]) {
  const chain = CHAIN_OF[g.connector as IntegrationId];
  if (!chain) return [];
  return g.agentSlugs.flatMap((slug) => {
    const a = team.find((t) => t.slug === slug);
    if (!a) return [];
    try {
      if (chain === "solana") { const addr = solanaKeypair(userId, slug, a.kind).publicKey.toBase58(); return [{ agent: slug, chain: "Solana", address: addr, explorer: addrExplorer(addr) }]; }
      if (chain === "zcash") { const z = zcashAddress(userId, slug); return [{ agent: slug, chain: "Zcash", address: z, explorer: zcashExplorer(z) }]; }
      const addr = evmAddress(userId, slug);
      if (chain === "polygon") return [{ agent: slug, chain: "Polygon", address: addr, explorer: `https://polygonscan.com/address/${addr}` }];
      if (chain === "tempo") return [{ agent: slug, chain: TEMPO.network, address: addr, explorer: TEMPO.explorerAddr(addr) }];
      if (chain === "hyperliquid") return [{ agent: slug, chain: HL_NETWORK, address: addr, explorer: hlExplorer(addr) }];
      return [{ agent: slug, chain: EVM[chain].network, address: addr, explorer: `${EVM[chain].explorer}${addr}` }];
    } catch { return []; }
  });
}

/** The scopes a grant carries: what you allowed, or every scope for grants made before consent existed. */
export const grantScopes = (g: Pick<Grant, "connector" | "scopes">): Scope[] => (g.scopes ?? scopesOf(g.connector)).filter((s): s is Scope => scopesOf(g.connector).includes(s as Scope));
export const isLive = (g: Pick<Grant, "enabled" | "expiresAt">, now = Date.now()) => g.enabled && (!g.expiresAt || g.expiresAt.getTime() > now);

export async function audit(userId: string, connector: string, event: string, detail: Record<string, unknown> = {}, tx = db()) {
  await tx.insert(integrationAudit).values({ userId, connector, event, detail });
}

/** Unconfirmed cards for this integration can no longer be confirmed. Returns how many were cancelled. */
async function cancelPending(userId: string, connector: string, why: string, tx = db()) {
  const rows = await tx.update(integrationActions).set({ status: "cancelled", error: why, settledAt: new Date() })
    .where(and(eq(integrationActions.userId, userId), eq(integrationActions.connector, connector), eq(integrationActions.status, "prepared"))).returning({ id: integrationActions.id });
  return rows.length;
}

/** The on-chain side of a revoke, where one exists: Hyperliquid replaces each agent's trade-only API wallet. Best effort, after the grant is already off. */
function revokeOnChain(userId: string, g: Pick<Grant, "connector" | "agentSlugs">) {
  if (g.connector !== "hyperliquid") return;
  for (const slug of g.agentSlugs) void revokeApiWallet(userId, slug).catch((e) => console.error(`[integrations] hl revoke: ${(e as Error).message?.slice(0, 160)}`));
}

/** Grants whose time ran out switch off (once), cancel their pending cards and leave an audit line. */
export async function expireDue(userId: string) {
  const due = await db().update(integrationGrants).set({ enabled: false, updatedAt: new Date() })
    .where(and(eq(integrationGrants.userId, userId), eq(integrationGrants.enabled, true), isNotNull(integrationGrants.expiresAt), lte(integrationGrants.expiresAt, new Date()))).returning();
  for (const g of due) {
    const cancelled = await cancelPending(userId, g.connector, "The integration's access expired.");
    await audit(userId, g.connector, "expire", { cancelled });
    revokeOnChain(userId, g);
  }
  return due.length;
}

export async function listIntegrations(userId: string) {
  await expireDue(userId);
  const database = db();
  const [grants, team] = await Promise.all([
    database.select().from(integrationGrants).where(eq(integrationGrants.userId, userId)).orderBy(integrationGrants.createdAt),
    teamOf(userId),
  ]);
  const recent = grants.length ? await database.select().from(integrationActions).where(eq(integrationActions.userId, userId)).orderBy(desc(integrationActions.createdAt)).limit(120) : [];
  const added: AddedIntegration[] = await Promise.all(grants.filter((g) => integrationById(g.connector)).map(async (g) => ({
    id: g.id, connector: g.connector as IntegrationId, enabled: g.enabled, agents: g.agentSlugs.filter((s) => team.some((t) => t.slug === s)),
    perTxUsd: g.perTxUsd, dailyUsd: g.dailyUsd, maxSlippageBps: g.maxSlippageBps,
    spentTodayUsd: integrationById(g.connector)?.moves ? (await spentToday(userId, g.connector)) / 1e6 : 0,
    scopes: grantScopes(g), expiresAt: g.expiresAt?.getTime() ?? null,
    addresses: addressesFor(userId, g, team),
    activity: recent.filter((a) => a.connector === g.connector).slice(0, 6).map((a): ActivityRow => {
      const c = cardOf(a);
      return { id: a.id, tool: a.tool, agent: a.agentSlug, status: c.status, usd: c.usd, title: c.title, sig: c.sig, explorer: c.explorer, error: c.error, at: a.createdAt.getTime() };
    }),
    at: g.createdAt.getTime(),
  })));
  return { added, agents: team };
}

/** scopes and expiresDays together are a consent: they come from the consent popup and switch the grant on. */
export type GrantInput = { agents?: string[]; enabled?: boolean; perTxUsd?: number; dailyUsd?: number; maxSlippageBps?: number; scopes?: string[]; expiresDays?: number };

const connectorOf = (input: GrantInput) => (input as { connector?: string }).connector ?? "";

async function cleanInput(userId: string, input: GrantInput & { connector?: string }, current?: Grant) {
  const out: Partial<Grant> = {};
  if (input.agents) {
    const team = await teamOf(userId);
    const bad = input.agents.filter((s) => !team.some((t) => t.slug === s));
    if (bad.length) throw new HttpError(400, "One of those agents isn't on your team.");
    out.agentSlugs = [...new Set(input.agents)];
  }
  if (input.enabled !== undefined) out.enabled = input.enabled;
  if ((input.scopes === undefined) !== (input.expiresDays === undefined)) throw new HttpError(400, "Pick what agents may do and for how long.");
  if (input.scopes && input.expiresDays !== undefined) {
    const allowed = scopesOf(current?.connector ?? connectorOf(input));
    const bad = input.scopes.filter((x) => !allowed.includes(x as Scope));
    if (bad.length) throw new HttpError(400, "That integration can't do one of those things.");
    if (!(EXPIRY_DAYS as readonly number[]).includes(input.expiresDays)) throw new HttpError(400, `Access lasts ${EXPIRY_DAYS.join(", ")} days.`);
    out.scopes = [...new Set<string>(["read", ...input.scopes])];
    out.expiresAt = new Date(Date.now() + input.expiresDays * 86_400_000);
    out.consentedAt = new Date();
    out.enabled = true;
  } else if (input.enabled === true && current && !isLive(current)) {
    // Switching it back on is a new consent (the popup), never a bare toggle.
    throw new HttpError(409, current.enabled ? "Its access expired. Review and allow it again." : "Review what it can do and allow it first.");
  }
  const perTx = input.perTxUsd ?? current?.perTxUsd ?? LIMITS.perTx.def;
  const daily = input.dailyUsd ?? current?.dailyUsd ?? LIMITS.daily.def;
  const slip = input.maxSlippageBps ?? current?.maxSlippageBps ?? LIMITS.slippageBps.def;
  if (!Number.isInteger(perTx) || perTx < LIMITS.perTx.min || perTx > LIMITS.perTx.max) throw new HttpError(400, `Per trade has to be between $${LIMITS.perTx.min} and $${LIMITS.perTx.max}.`);
  if (!Number.isInteger(daily) || daily < LIMITS.daily.min || daily > LIMITS.daily.max) throw new HttpError(400, `Daily has to be between $${LIMITS.daily.min} and $${LIMITS.daily.max}.`);
  if (daily < perTx) throw new HttpError(400, "The daily limit can't be lower than the per trade limit.");
  if (!Number.isInteger(slip) || slip < LIMITS.slippageBps.min || slip > LIMITS.slippageBps.max) throw new HttpError(400, `Max slippage has to be between ${LIMITS.slippageBps.min / 100}% and ${LIMITS.slippageBps.max / 100}%.`);
  return { ...out, perTxUsd: perTx, dailyUsd: daily, maxSlippageBps: slip };
}

export async function addIntegration(userId: string, connector: string, input: GrantInput) {
  const info = integrationById(connector);
  if (!info) throw new HttpError(404, "There's no integration with that name.");
  if (!info.addable) throw new HttpError(409, `${info.name} is coming soon, so it can't be added yet.`);
  // Adding is a consent: it always says what agents may do and for how long.
  const clean = await cleanInput(userId, { ...input, connector, scopes: input.scopes ?? defaultScopes(connector), expiresDays: input.expiresDays ?? DEFAULT_EXPIRY_DAYS });
  const [row] = await db().insert(integrationGrants).values({
    userId, connector, enabled: true, agentSlugs: clean.agentSlugs ?? [], perTxUsd: clean.perTxUsd, dailyUsd: clean.dailyUsd, maxSlippageBps: clean.maxSlippageBps,
    scopes: clean.scopes, expiresAt: clean.expiresAt, consentedAt: clean.consentedAt,
  }).onConflictDoNothing().returning();
  if (!row) throw new HttpError(409, `${info.name} is already added.`);
  await audit(userId, connector, "consent", consentDetail(row));
  return row;
}

async function ownGrant(userId: string, id: string) {
  const [g] = await db().select().from(integrationGrants).where(and(eq(integrationGrants.userId, userId), eq(integrationGrants.id, id))).limit(1);
  if (!g) throw new HttpError(404, "That integration isn't added.");
  return g;
}

export async function updateIntegration(userId: string, id: string, input: GrantInput) {
  const g = await ownGrant(userId, id);
  const clean = await cleanInput(userId, input, g);
  const row = await db().transaction(async (tx) => {
    const [r] = await tx.update(integrationGrants).set({ ...clean, updatedAt: new Date() }).where(eq(integrationGrants.id, g.id)).returning();
    if (clean.consentedAt) await audit(userId, g.connector, "consent", consentDetail(r), tx as never);
    else if (g.enabled && clean.enabled === false) {
      const cancelled = await cancelPending(userId, g.connector, "The integration was switched off.", tx as never);
      await audit(userId, g.connector, "revoke", { cancelled }, tx as never);
    } else {
      const changed: Record<string, unknown> = {};
      if (input.agents && input.agents.join() !== g.agentSlugs.join()) changed.agents = r.agentSlugs;
      for (const k of ["perTxUsd", "dailyUsd", "maxSlippageBps"] as const) if (r[k] !== g[k]) changed[k] = r[k];
      if (clean.enabled === true && !g.enabled) changed.enabled = true;
      if (Object.keys(changed).length) await audit(userId, g.connector, "change", changed, tx as never);
    }
    return r;
  });
  if (g.enabled && row.enabled === false) revokeOnChain(userId, g);
  return row;
}

/** Removes it. Any confirm card it left in chat can no longer be confirmed. */
export async function removeIntegration(userId: string, id: string) {
  const g = await ownGrant(userId, id);
  await db().transaction(async (tx) => {
    await tx.delete(integrationGrants).where(eq(integrationGrants.id, g.id));
    const cancelled = await cancelPending(userId, g.connector, "The integration was removed.", tx as never);
    await audit(userId, g.connector, "remove", { cancelled }, tx as never);
  });
  revokeOnChain(userId, g);
  return { removed: g.connector };
}

/** The kill switch: every integration off at once, every unconfirmed card cancelled. */
export async function revokeAll(userId: string) {
  const n = await db().transaction(async (tx) => {
    const live = await tx.update(integrationGrants).set({ enabled: false, updatedAt: new Date() }).where(and(eq(integrationGrants.userId, userId), eq(integrationGrants.enabled, true))).returning();
    for (const g of live) {
      const cancelled = await cancelPending(userId, g.connector, "You switched off every integration.", tx as never);
      await audit(userId, g.connector, "revoke", { cancelled, all: true }, tx as never);
    }
    return live;
  });
  for (const g of n) revokeOnChain(userId, g);
  return n.length;
}

const consentDetail = (g: Grant) => ({ scopes: grantScopes(g), agents: g.agentSlugs, perTxUsd: g.perTxUsd, dailyUsd: g.dailyUsd, maxSlippageBps: g.maxSlippageBps, expiresAt: g.expiresAt?.toISOString() ?? null });

const DECISION: Record<string, string> = { done: "read", confirmed: "confirmed", submitted: "confirmed", submitting: "pending", prepared: "pending", rejected: "denied", cancelled: "cancelled", expired: "cancelled", failed: "failed" };
const EVENT_TITLE: Record<string, string> = { consent: "You allowed access", change: "You changed access", revoke: "You switched it off", expire: "Access expired", remove: "You removed it" };
const SCOPE_WORD: Record<string, string> = { read: "read", trade: "trade", bet: "positions", withdraw: "send to linked wallets", transfer: "send anywhere" };

function eventDetail(event: string, d: Record<string, unknown>) {
  if (event === "consent") {
    const parts = [(d.scopes as string[] | undefined)?.map((x) => SCOPE_WORD[x] || x).join(", ")];
    if (typeof d.perTxUsd === "number") parts.push(`$${d.perTxUsd} per trade, $${d.dailyUsd} a day`);
    if (typeof d.expiresAt === "string") parts.push(`until ${new Date(d.expiresAt).toUTCString().slice(5, 16)}`);
    return parts.filter(Boolean).join(" · ");
  }
  if (event === "change") return Object.keys(d).map((k) => ({ agents: "agents", perTxUsd: "per trade", dailyUsd: "daily", maxSlippageBps: "slippage", enabled: "switched on" }[k] || k)).join(", ");
  if (typeof d.cancelled === "number" && d.cancelled > 0) return `${d.cancelled} unconfirmed action${d.cancelled === 1 ? "" : "s"} cancelled`;
  return undefined;
}

/** The audit log: your grant changes and every call agents made, newest first. */
export async function auditOf(userId: string, opts: { connector?: string; limit?: number; before?: number } = {}): Promise<AuditRow[]> {
  const limit = Math.min(200, Math.max(1, opts.limit ?? 60));
  const before = opts.before ? new Date(opts.before) : new Date(Date.now() + 60_000);
  const database = db();
  const [events, acts] = await Promise.all([
    database.select().from(integrationAudit).where(and(eq(integrationAudit.userId, userId), sql`${integrationAudit.createdAt} < ${before}`, opts.connector ? eq(integrationAudit.connector, opts.connector) : undefined)).orderBy(desc(integrationAudit.createdAt)).limit(limit),
    database.select().from(integrationActions).where(and(eq(integrationActions.userId, userId), sql`${integrationActions.createdAt} < ${before}`, opts.connector ? eq(integrationActions.connector, opts.connector) : undefined)).orderBy(desc(integrationActions.createdAt)).limit(limit),
  ]);
  const rows: AuditRow[] = [
    ...events.map((e): AuditRow => ({ id: e.id, connector: e.connector as IntegrationId, at: e.createdAt.getTime(), kind: e.event, title: EVENT_TITLE[e.event] || e.event, detail: eventDetail(e.event, (e.detail || {}) as Record<string, unknown>) })),
    ...acts.map((a): AuditRow => {
      const c = cardOf(a);
      const kind = DECISION[a.status] || "failed";
      return { id: a.id, connector: a.connector as IntegrationId, at: a.createdAt.getTime(), kind, title: c.title || a.tool, agent: a.agentSlug, usd: c.usd || undefined, detail: a.error || undefined, explorer: c.explorer };
    }),
  ];
  return rows.sort((x, y) => y.at - x.at).slice(0, limit);
}

/** Integrations this agent can use right now: you added it, switched it on and granted it this agent. */
export async function usableGrants(userId: string, slug: string) {
  const own = builtinGrants(userId, slug);
  await expireDue(userId).catch(() => 0);
  const rows = await db().select().from(integrationGrants).where(and(eq(integrationGrants.userId, userId), eq(integrationGrants.enabled, true), sql`${slug} = any(${integrationGrants.agentSlugs})`));
  return { grants: [...rows.filter((g) => isLive(g) && INTEGRATIONS.some((i) => i.id === g.connector && i.addable)), ...own] };
}

/** Built-in connectors this agent always has (agent payments for everyone, the ORE Miner's servers): never in the
 * integration_grants table; payments are limited by the agent's budget instead of grant limits. */
export const isBuiltin = (connector: string) => !!integrationById(connector)?.builtin;
export function builtinGrants(userId: string, slug: string): Grant[] {
  const now = new Date();
  return INTEGRATIONS.filter((i) => i.builtin === "all" || (Array.isArray(i.builtin) && i.builtin.includes(slug))).map((i) => ({
    id: `builtin-${i.id}`, userId, connector: i.id, enabled: true, agentSlugs: [slug], perTxUsd: LIMITS.perTx.max, dailyUsd: LIMITS.daily.max, maxSlippageBps: LIMITS.slippageBps.def, scopes: null, expiresAt: null, consentedAt: null, createdAt: now, updatedAt: now,
  }) as Grant);
}
