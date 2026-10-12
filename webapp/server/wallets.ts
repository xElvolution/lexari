/**
 * Wallets you linked through Privy, and the one you picked as active. The browser never says what is linked: it hands
 * over a Privy token, and the linked wallets are read from it on the server (same check as social linking).
 * Agents may withdraw only to these wallets (plus the wallet you sign in with) unless you allowed "send to any address".
 */
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import { linkedWallets, walletPrefs } from "./db/integrationsSchema";
import { HttpError } from "./http";
import { readOwnPrivy } from "./social";
import { chainById, familyOf, normAddress, type LinkedWallet, type WalletFamily, type WalletsReply } from "@/content/wallets";

/** Wallets in a Privy linked_accounts list (identity token and REST use the same snake_case keys). */
export function walletsIn(list: unknown): { address: string; family: WalletFamily; client: string }[] {
  if (!Array.isArray(list)) return [];
  const out: { address: string; family: WalletFamily; client: string }[] = [];
  for (const a of list as Record<string, unknown>[]) {
    if (!a || a.type !== "wallet" || typeof a.address !== "string") continue;
    const family = a.chain_type === "solana" ? "solana" : a.chain_type === "ethereum" ? "evm" : null;
    if (!family || familyOf(a.address) !== family) continue;
    const address = normAddress(a.address);
    if (out.some((w) => w.address === address)) continue;
    const client = String(a.wallet_client_type || a.connector_type || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 40);
    out.push({ address, family, client });
  }
  return out;
}

async function loginWallet(userId: string) {
  const [u] = await db().select({ wallet: users.wallet }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new HttpError(401, "You're signed out. Sign in again.");
  return u.wallet;
}

export async function walletsOf(userId: string): Promise<WalletsReply> {
  const [login, rows, [pref]] = await Promise.all([
    loginWallet(userId),
    db().select().from(linkedWallets).where(eq(linkedWallets.userId, userId)).orderBy(linkedWallets.verifiedAt),
    db().select().from(walletPrefs).where(eq(walletPrefs.userId, userId)).limit(1),
  ]);
  const wallets: LinkedWallet[] = [
    ...(familyOf(login) ? [{ address: login, family: familyOf(login)!, client: "lexari", login: true, verifiedAt: 0 }] : []),
    ...rows.filter((r) => r.address !== login).map((r) => ({ address: r.address, family: r.family as WalletFamily, client: r.client, verifiedAt: r.verifiedAt.getTime() })),
  ];
  const ok = pref && wallets.some((w) => w.address === pref.activeAddress) && chainById(pref.activeChain)?.family === familyOf(pref.activeAddress);
  const fallback = wallets[0] ? { address: wallets[0].address, chain: wallets[0].family === "solana" ? "solana" : "base" } : null;
  return { wallets, active: ok ? { address: pref.activeAddress, chain: pref.activeChain } : fallback };
}

const isUnique = (e: unknown) => (e as { code?: string })?.code === "23505" || (e as { cause?: { code?: string } })?.cause?.code === "23505";

/** Mirrors the wallets on your Privy account into Lexari. A wallet already linked to another Lexari account is refused. */
export async function syncWallets(user: { userId: string }, tokens: { idToken?: string; accessToken?: string }) {
  const snap = await readOwnPrivy(user, tokens);
  const found = walletsIn(snap.raw);
  const conflicts: string[] = [];
  await db().transaction(async (tx) => {
    const current = await tx.select().from(linkedWallets).where(eq(linkedWallets.userId, user.userId)).for("update");
    for (const c of current) if (!found.some((f) => f.address === c.address)) await tx.delete(linkedWallets).where(and(eq(linkedWallets.userId, user.userId), eq(linkedWallets.address, c.address)));
    for (const f of found) {
      const [owner] = await tx.select({ userId: linkedWallets.userId }).from(linkedWallets).where(eq(linkedWallets.address, f.address)).limit(1);
      if (owner && owner.userId !== user.userId) { conflicts.push(f.address); continue; }
      await tx.insert(linkedWallets).values({ userId: user.userId, ...f, verifiedAt: new Date() })
        .onConflictDoUpdate({ target: [linkedWallets.userId, linkedWallets.address], set: { client: f.client, verifiedAt: new Date() } });
    }
  }).catch((e) => { if (isUnique(e)) throw new HttpError(409, "That wallet was just linked to another Lexari account."); throw e; });
  return { ...(await walletsOf(user.userId)), conflicts: conflicts.map((a) => `${a.slice(0, 6)}…${a.slice(-4)} is already linked to another Lexari account.`) };
}

/** Removes a wallet from Lexari (the browser unlinks it from Privy first). The sign-in wallet stays. */
export async function unlinkWallet(userId: string, address: string) {
  const a = normAddress(address);
  if (a === (await loginWallet(userId))) throw new HttpError(400, "That's the wallet you sign in with, so it stays linked.");
  await db().transaction(async (tx) => {
    await tx.delete(linkedWallets).where(and(eq(linkedWallets.userId, userId), eq(linkedWallets.address, a)));
    await tx.delete(walletPrefs).where(and(eq(walletPrefs.userId, userId), eq(walletPrefs.activeAddress, a)));
  });
  return walletsOf(userId);
}

/** Picks the active wallet and chain. The chain has to fit the wallet (Solana wallets on Solana, EVM wallets on EVM chains). */
export async function setActiveWallet(userId: string, address: string, chain: string) {
  const a = normAddress(address);
  const { wallets } = await walletsOf(userId);
  const w = wallets.find((x) => x.address === a);
  if (!w) throw new HttpError(404, "Link that wallet first.");
  const c = chainById(chain);
  if (!c) throw new HttpError(400, "There's no chain with that name.");
  if (c.family !== w.family) throw new HttpError(400, `${c.name} needs ${c.family === "evm" ? "an EVM" : "a Solana"} wallet.`);
  await db().insert(walletPrefs).values({ userId, activeAddress: a, activeChain: c.id, updatedAt: new Date() })
    .onConflictDoUpdate({ target: walletPrefs.userId, set: { activeAddress: a, activeChain: c.id, updatedAt: new Date() } });
  return walletsOf(userId);
}

/** True when the address is the wallet you sign in with or one you linked. */
export async function isOwnWallet(userId: string, address: string) {
  const a = normAddress(address);
  if (a === (await loginWallet(userId))) return true;
  const [r] = await db().select({ a: linkedWallets.address }).from(linkedWallets).where(and(eq(linkedWallets.userId, userId), eq(linkedWallets.address, a))).limit(1);
  return !!r;
}

/** "me" in a transfer: your active wallet when it fits the chain family, otherwise your first wallet of that family. */
export async function myWalletFor(userId: string, family: WalletFamily) {
  const { wallets, active } = await walletsOf(userId);
  if (active && familyOf(active.address) === family) return active.address;
  return wallets.find((w) => w.family === family)?.address ?? null;
}
