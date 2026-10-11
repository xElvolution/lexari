import { useRef } from "react";
import { useEmbeddedSolanaWallet, useLoginWithEmail, useLoginWithOAuth, usePrivy } from "@privy-io/expo";
import { nonceFor, signInWithServer } from "@/lib/authFlow";
import type { SavedSession } from "@/lib/session";

export type Methods = { google: () => Promise<void>; sendCode: (email: string) => Promise<void>; verify: (email: string, code: string) => Promise<void> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function usePlatformMethods(onSession: (s: SavedSession) => Promise<void>): Methods {
  const emailLogin = useLoginWithEmail();
  const oauth = useLoginWithOAuth();
  const privy = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  // finish() runs right after login resolves, before React re-renders with the new wallet state.
  // Read the latest hook values through refs so we never act on the render that started the login.
  const solanaRef = useRef(solana);
  solanaRef.current = solana;
  const privyRef = useRef(privy);
  privyRef.current = privy;
  const onSessionRef = useRef(onSession);
  onSessionRef.current = onSession;

  const settle = async (ms: number) => {
    for (let waited = 0; waited < ms; waited += 250) {
      const s = solanaRef.current;
      if (s.wallets?.[0]) return;
      if (s.status === "not-created" || s.status === "error" || s.status === "needs-recovery") return;
      await sleep(250);
    }
  };

  const finish = async (email?: string) => {
    await settle(10000);
    let wallet = solanaRef.current.wallets?.[0];
    if (!wallet) {
      const create = solanaRef.current.create;
      if (create) {
        try { await create(); } catch { /* already created on another device or still settling */ }
      }
      for (let i = 0; i < 40 && !solanaRef.current.wallets?.[0]; i++) await sleep(250);
      wallet = solanaRef.current.wallets?.[0];
    }
    if (!wallet) throw new Error("We couldn't set up your wallet. Please try again.");
    const provider = await wallet.getProvider();
    const message = await nonceFor(wallet.address);
    const signed = await provider.request({ method: "signMessage", params: { message } });
    const token = await privyRef.current.getAccessToken();
    await onSessionRef.current(await signInWithServer({ wallet: wallet.address, message, signature: signed.signature, privyToken: token || undefined, email }));
  };
  return {
    google: async () => { await oauth.login({ provider: "google" }); await finish(); },
    sendCode: async (email) => { await emailLogin.sendCode({ email }); },
    verify: async (email, code) => { await emailLogin.loginWithCode({ code, email }); await finish(email); },
  };
}
