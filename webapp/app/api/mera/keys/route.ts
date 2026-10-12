import { z } from "zod";
import { eq } from "drizzle-orm";
import { verifyMessage } from "viem";
import { withUser } from "@/server/route";
import { noStore } from "@/server/http";
import { ownAgent } from "@/server/agentWallets";
import { db } from "@/server/db";
import { passkeyAgentKeys, passkeyLogins } from "@/server/db/passkeySchema";
import { verifySolanaSignature } from "@/server/auth/siws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Your Mera passkeys and the key each agent got from them. */
export const GET = withUser(async (user) => {
  const d = db();
  const [logins, keys] = await Promise.all([
    d.select({ address: passkeyLogins.address, createdAt: passkeyLogins.createdAt }).from(passkeyLogins).where(eq(passkeyLogins.userId, user.userId)),
    d.select({ agent: passkeyAgentKeys.agentSlug, address: passkeyAgentKeys.address }).from(passkeyAgentKeys).where(eq(passkeyAgentKeys.userId, user.userId)),
  ]);
  return Response.json({ passkeys: logins, keys }, { headers: noStore });
});

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const body = z.object({
  address: z.string().min(32).max(44), credentialId: z.string().min(8).max(400), proof: z.string().max(200), signature: z.string().min(64).max(200),
  keys: z.array(z.object({ agent: z.string().min(1).max(64), address: addr, signature: z.string().regex(/^0x[0-9a-fA-F]+$/).max(200) })).max(50),
});

/** Link a passkey: its sign-in key proves itself, and each agent key signs its own label. */
export const POST = withUser(async (user, req) => {
  const b = body.parse(await req.json());
  if (b.proof !== `Link this passkey to my Lexari account: ${b.address}` || !verifySolanaSignature(b.proof, b.signature, b.address)) return Response.json({ error: "The passkey didn't sign that." }, { status: 400 });
  const d = db();
  const [taken] = await d.select({ userId: passkeyLogins.userId }).from(passkeyLogins).where(eq(passkeyLogins.address, b.address)).limit(1);
  if (taken && taken.userId !== user.userId) return Response.json({ error: "That passkey is linked to a different account." }, { status: 409 });
  for (const k of b.keys) {
    await ownAgent(user.userId, k.agent);
    if (!(await verifyMessage({ address: k.address as `0x${string}`, message: `Lexari agent key for ${k.agent}: ${k.address}`, signature: k.signature as `0x${string}` }))) return Response.json({ error: `The key for ${k.agent} didn't check out.` }, { status: 400 });
  }
  await d.insert(passkeyLogins).values({ address: b.address, userId: user.userId, credentialId: b.credentialId }).onConflictDoNothing();
  for (const k of b.keys) {
    await d.insert(passkeyAgentKeys).values({ userId: user.userId, agentSlug: k.agent, address: k.address }).onConflictDoUpdate({ target: [passkeyAgentKeys.userId, passkeyAgentKeys.agentSlug], set: { address: k.address } });
  }
  return Response.json({ ok: true }, { headers: noStore });
});
