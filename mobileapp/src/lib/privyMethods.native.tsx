import { useEmbeddedSolanaWallet, useLoginWithEmail, useLoginWithOAuth, usePrivy } from "@privy-io/expo";
import { nonceFor, signInWithServer } from "@/lib/authFlow";
import type { SavedSession } from "@/lib/session";

export type Methods = { google: () => Promise<void>; sendCode: (email: string) => Promise<void>; verify: (email: string, code: string) => Promise<void> };

export function usePlatformMethods(onSession: (s: SavedSession) => Promise<void>): Methods {
  const emailLogin = useLoginWithEmail();
  const oauth = useLoginWithOAuth();
  const privy = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  const finish = async (email?: string) => {
    const wallet = solana.wallets?.[0];
    let provider = wallet ? await wallet.getProvider() : null;
    if (!provider && solana.create) provider = await solana.create();
    const address = wallet?.address || provider?._publicKey;
    if (!provider || !address) throw new Error("We couldn't set up your wallet. Please try again.");
    const message = await nonceFor(address);
    const signed = await provider.request({ method: "signMessage", params: { message } });
    const token = await privy.getAccessToken();
    await onSession(await signInWithServer({ wallet: address, message, signature: signed.signature, privyToken: token || undefined, email }));
  };
  return {
    google: async () => { await oauth.login({ provider: "google" }); await finish(); },
    sendCode: async (email) => { await emailLogin.sendCode({ email }); },
    verify: async (email, code) => { await emailLogin.loginWithCode({ code, email }); await finish(email); },
  };
}
