"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { onSignOut } from "./walletBridge";
import type { WalletsReply } from "@/content/wallets";

export type WalletsState = WalletsReply & { loaded: boolean; error?: string };
const EMPTY: WalletsState = { wallets: [], active: null, loaded: false };
let state: WalletsState = EMPTY;
const subs = new Set<() => void>();
const take = (r: WalletsReply) => { state = { ...r, loaded: true }; subs.forEach((f) => f()); return r; };

export async function loadWallets() {
  try { return take(await api<WalletsReply>("/api/wallets")); }
  catch (e) { state = { ...state, loaded: true, error: (e as Error).message }; subs.forEach((f) => f()); return null; }
}
export function useWallets(): WalletsState {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => EMPTY);
  useEffect(() => { if (!state.loaded) void loadWallets(); }, []);
  return s;
}
/** After Privy links or unlinks a wallet: the server re-reads your Privy account from a token. */
export async function syncWallets(tokens: { idToken?: string | null; accessToken?: string | null }) {
  const r = await api<WalletsReply & { conflicts: string[] }>("/api/wallets", { body: { idToken: tokens.idToken || undefined, accessToken: tokens.accessToken || undefined } });
  take(r);
  return r.conflicts;
}
export async function setActiveWallet(address: string, chain: string) { take(await api<WalletsReply>("/api/wallets", { method: "PATCH", body: { address, chain } })); }
export async function forgetWallet(address: string) { take(await api<WalletsReply>(`/api/wallets?address=${encodeURIComponent(address)}`, { method: "DELETE" })); }

onSignOut("wallets", () => { state = EMPTY; subs.forEach((f) => f()); });
