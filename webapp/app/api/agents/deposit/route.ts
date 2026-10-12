import { z } from "zod";
import { withUser } from "@/server/route";
import { noStore } from "@/server/http";
import { ownAgent, solanaKeypair } from "@/server/agentWallets";
import { evmAddress } from "@/server/integrations/evm";
import { db } from "@/server/db";
import { agents } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { depositCoins, depositAddress, chainName } from "@/server/integrations/deposit";
import { intentsReady } from "@/server/integrations/intents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The deposit coin picker: every coin Aurora Intents takes, with logos and the networks each one comes from. */
export const GET = withUser(async () => {
  const coins = await depositCoins();
  return Response.json({ ready: intentsReady(), coins: coins.map((c) => ({ ...c, chains: c.chains.map((x) => ({ ...x, chainName: chainName(x.chain) })) })) }, { headers: noStore });
});

const body = z.object({ agent: z.string().min(1).max(64), assetId: z.string().min(3).max(200), amount: z.coerce.number().positive().max(1_000_000) });
export const POST = withUser(async (user, req) => {
  const b = body.parse(await req.json());
  await ownAgent(user.userId, b.agent);
  const [a] = await db().select({ kind: agents.kind }).from(agents).where(and(eq(agents.userId, user.userId), eq(agents.slug, b.agent))).limit(1);
  const me = solanaKeypair(user.userId, b.agent, a?.kind || "home").publicKey.toBase58();
  try { return Response.json(await depositAddress(me, evmAddress(user.userId, b.agent), b.assetId, b.amount), { headers: noStore }); }
  catch (e) { const m = e instanceof Error ? e.message : "Couldn't get a deposit address.";
    return Response.json({ error: m, message: m }, { status: 400, headers: noStore }); }
});
