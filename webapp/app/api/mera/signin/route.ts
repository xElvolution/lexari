import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { passkeyLogins } from "@/server/db/passkeySchema";
import { isWallet, verifySolanaSignature } from "@/server/auth/siws";
import { SESSION_COOKIE, sessionCookieOptions, startSession } from "@/server/auth/session";
import { clientIp, jsonError, rateLimit, readJson, toErrorResponse } from "@/server/http";

export const runtime = "nodejs";
const body = z.object({ address: z.string().min(32).max(44), message: z.string().min(20).max(500).optional(), signature: z.string().min(64).max(200).optional() });

/** Mera passkey sign-in for a passkey linked to an account. Step 1 returns a one-time message; step 2 checks it. */
export async function POST(req: Request) {
  const b = await readJson(req, body);
  if (b instanceof Response) return b;
  if (!isWallet(b.address)) return jsonError(400, "That passkey key isn't valid.");
  try {
    if (!(await rateLimit(`mera:${clientIp(req)}`, 20))) return jsonError(429, "Too many sign-in attempts. Wait a minute.");
    const d = db();
    const [row] = await d.select().from(passkeyLogins).where(eq(passkeyLogins.address, b.address)).limit(1);
    if (!row) return Response.json({ linked: false });
    if (!b.message || !b.signature) {
      const message = `Sign in to Lexari with your passkey.\nKey: ${b.address}\nNonce: ${crypto.randomBytes(12).toString("hex")}\nIssued: ${new Date().toISOString()}`;
      await d.update(passkeyLogins).set({ nonceMessage: message, nonceExpires: new Date(Date.now() + 5 * 60_000) }).where(eq(passkeyLogins.address, b.address));
      return Response.json({ linked: true, message });
    }
    if (!row.nonceMessage || row.nonceMessage !== b.message || !row.nonceExpires || row.nonceExpires.getTime() < Date.now()) return jsonError(400, "That sign-in expired. Start again.");
    if (!verifySolanaSignature(b.message, b.signature, b.address)) return jsonError(401, "The passkey signature doesn't match.");
    await d.update(passkeyLogins).set({ nonceMessage: null, nonceExpires: null }).where(eq(passkeyLogins.address, b.address));
    const s = await startSession(row.userId, { ua: req.headers.get("user-agent") || "", ip: clientIp(req) });
    (await cookies()).set(SESSION_COOKIE, s.token, sessionCookieOptions(s.expires));
    const mobile = (req.headers.get("x-lexari-client") || "").toLowerCase() === "android" || new URL(req.url).searchParams.get("client") === "mobile";
    return Response.json({ wallet: s.wallet, ...(mobile ? { token: s.token, expires: s.expires.toISOString() } : {}) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
