import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { agents } from "@/server/db/schema";
import { agentDelegations } from "@/server/db/delegationSchema";
import { jsonError, noStore, rateLimit, readJson } from "@/server/http";
import { withUser } from "@/server/route";
import { ownAgent } from "@/server/agentWallets";
import { evmAddress } from "@/server/integrations/evm";
import { MONAD } from "@/server/integrations/monad";
import { logEvent, requireStepUp } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hex = /^0x[0-9a-fA-F]*$/;
const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const delegationShape = z.object({
  delegate: addr, delegator: addr, authority: z.string().regex(hex), salt: z.union([z.string(), z.number()]), signature: z.string().regex(hex).min(10),
  caveats: z.array(z.object({ enforcer: addr, terms: z.string().regex(hex), args: z.string().regex(hex) })).min(1).max(8),
}).strict();

async function view(userId: string) {
  const [team, rows] = await Promise.all([
    db().select({ slug: agents.slug, name: agents.name }).from(agents).where(eq(agents.userId, userId)),
    db().select().from(agentDelegations).where(and(eq(agentDelegations.userId, userId), isNull(agentDelegations.revokedAt))).orderBy(desc(agentDelegations.createdAt)),
  ]);
  return {
    chainId: MONAD.chainId, rpc: process.env.MONAD_PUBLIC_RPC || "https://testnet-rpc.monad.xyz",
    agents: team.map((a) => ({ slug: a.slug, name: a.name, address: evmAddress(userId, a.slug) })),
    delegations: rows.filter((r) => r.expiresAt.getTime() > Date.now()).map((r) => ({ id: r.id, agent: r.agentSlug, delegator: r.delegator, owner: r.owner, maxWei: r.maxWei, spentWei: r.spentWei, expiresAt: r.expiresAt.getTime(), delegation: r.delegation })),
  };
}

/** Your agents' EVM addresses and your live MetaMask delegations to them. */
export const GET = withUser(async (user) => Response.json(await view(user.userId), { headers: noStore }));

const body = z.object({ agent: z.string().max(40), owner: addr, delegation: delegationShape, maxMon: z.number().positive().max(1000), expiresAt: z.number().int() }).strict();
/** Stores a delegation you signed in MetaMask. It must name this agent and this server's Monad testnet. */
export const POST = withUser(async (user, req) => {
  if (!(await rateLimit(`delegations:${user.userId}`, 20, 3_600_000))) return jsonError(429, "Wait a minute and try again.");
  const b = await readJson(req, body);
  if (b instanceof Response) return b;
  await ownAgent(user.userId, b.agent);
  requireStepUp(user, "delegate funds to an agent");
  const agentAddr = evmAddress(user.userId, b.agent);
  if (b.delegation.delegate.toLowerCase() !== agentAddr.toLowerCase()) return jsonError(400, "That delegation names a different agent.");
  if (b.expiresAt <= Date.now() || b.expiresAt > Date.now() + 90 * 86_400_000) return jsonError(400, "Pick an expiry within 90 days.");
  const maxWei = (BigInt(Math.round(b.maxMon * 1e6)) * BigInt(1e12)).toString();
  await db().update(agentDelegations).set({ revokedAt: new Date() }).where(and(eq(agentDelegations.userId, user.userId), eq(agentDelegations.agentSlug, b.agent), isNull(agentDelegations.revokedAt)));
  await db().insert(agentDelegations).values({ userId: user.userId, agentSlug: b.agent, chainId: MONAD.chainId, owner: b.owner.toLowerCase(), delegator: b.delegation.delegator, delegate: agentAddr, delegation: b.delegation, maxWei, expiresAt: new Date(b.expiresAt) });
  await logEvent(user, "delegation", `Delegated up to ${b.maxMon} MON to ${b.agent} on Monad testnet`);
  return Response.json(await view(user.userId), { headers: noStore });
});

/** Revokes a delegation: the agent can't use it from now on. The web app also disables it on chain first (tx). */
export const DELETE = withUser(async (user, req) => {
  const id = new URL(req.url).searchParams.get("id") || "";
  const tx = new URL(req.url).searchParams.get("tx") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return jsonError(400, "Which delegation?");
  await db().update(agentDelegations).set({ revokedAt: new Date() }).where(and(eq(agentDelegations.userId, user.userId), eq(agentDelegations.id, id)));
  await logEvent(user, "delegation", /^0x[0-9a-fA-F]{64}$/.test(tx) ? `Revoked a MetaMask delegation on chain (tx ${tx})` : "Revoked a MetaMask delegation");
  return Response.json(await view(user.userId), { headers: noStore });
});
