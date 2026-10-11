import * as Crypto from "expo-crypto";
import { deleteItem, getItem, setItem } from "./storage";

/** The 6-digit app PIN. Only a salted SHA-256 is stored, never the digits. It only unlocks this phone. */
const PIN = "lexari.pin.v1";
const FAILS = "lexari.lockout.v1";
export const MAX_TRIES = 5;

async function hash(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return !!(await getItem(PIN));
}

export async function savePin(pin: string): Promise<void> {
  const salt = Array.from(Crypto.getRandomBytes(16)).map((b) => b.toString(16).padStart(2, "0")).join("");
  await setItem(PIN, JSON.stringify({ salt, hash: await hash(pin, salt) }));
  await deleteItem(FAILS);
}

export async function clearPin(): Promise<void> {
  await deleteItem(PIN);
  await deleteItem(FAILS);
}

type Fails = { n: number; until: number };
export async function lockoutState(): Promise<Fails> {
  try { return JSON.parse((await getItem(FAILS)) || "") as Fails; } catch { return { n: 0, until: 0 }; }
}

/** Returns ok, or the wait (ms) before the next try. Every 5 misses doubles the wait, starting at 30s. */
export async function checkPin(pin: string): Promise<{ ok: boolean; waitMs: number; left: number }> {
  const f = await lockoutState();
  if (f.until > Date.now()) return { ok: false, waitMs: f.until - Date.now(), left: 0 };
  const raw = await getItem(PIN);
  if (!raw) return { ok: false, waitMs: 0, left: MAX_TRIES };
  const saved = JSON.parse(raw) as { salt: string; hash: string };
  if ((await hash(pin, saved.salt)) === saved.hash) { await deleteItem(FAILS); return { ok: true, waitMs: 0, left: MAX_TRIES }; }
  const n = f.n + 1;
  const rounds = Math.floor(n / MAX_TRIES);
  const until = n % MAX_TRIES === 0 ? Date.now() + 30_000 * 2 ** (rounds - 1) : 0;
  await setItem(FAILS, JSON.stringify({ n, until }));
  return { ok: false, waitMs: until ? until - Date.now() : 0, left: MAX_TRIES - (n % MAX_TRIES) };
}
