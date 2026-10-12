import { z } from "zod";
import { jsonError, noStore, rateLimit, readJson } from "@/server/http";
import { withUser } from "@/server/route";
import { setActiveWallet, syncWallets, unlinkWallet, walletsOf } from "@/server/wallets";
import { logEvent } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Your linked wallets and the active wallet and chain. */
export const GET = withUser(async (user) => Response.json(await walletsOf(user.userId), { headers: noStore }));

const syncBody = z.object({ idToken: z.string().min(20).max(20_000).optional(), accessToken: z.string().min(20).max(8_000).optional() })
  .refine((b) => b.idToken || b.accessToken, "idToken or accessToken is required");

/** Re-reads the wallets on your Privy account (verified on the server) and stores them. */
export const POST = withUser(async (user, req) => {
  if (!(await rateLimit(`wallets:${user.userId}`, 12))) return jsonError(429, "Too many tries. Wait a minute.");
  const body = await readJson(req, syncBody);
  if (body instanceof Response) return body;
  const before = (await walletsOf(user.userId)).wallets.length;
  const out = await syncWallets(user, body);
  if (out.wallets.length > before) await logEvent(user, "address", "Linked a wallet");
  return Response.json(out, { headers: noStore });
});

const activeBody = z.object({ address: z.string().min(32).max(64), chain: z.string().min(2).max(20) }).strict();

/** Picks the active wallet and chain. */
export const PATCH = withUser(async (user, req) => {
  const body = await readJson(req, activeBody);
  if (body instanceof Response) return body;
  return Response.json(await setActiveWallet(user.userId, body.address, body.chain), { headers: noStore });
});

/** Removes a wallet from Lexari (the browser unlinks it from Privy first). */
export const DELETE = withUser(async (user, req) => {
  const address = new URL(req.url).searchParams.get("address");
  if (!address) return jsonError(400, "Which wallet?");
  const out = await unlinkWallet(user.userId, address);
  await logEvent(user, "address", "Unlinked a wallet");
  return Response.json(out, { headers: noStore });
});
