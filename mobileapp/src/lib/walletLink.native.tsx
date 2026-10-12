/**
 * Link a wallet to your Lexari account from the phone, through Privy (same checks as the web).
 *  - Solana: in the app. Mobile Wallet Adapter (Phantom, Solflare, Seed Vault…) signs Privy's SIWS message, Privy
 *    links it, and Lexari syncs it from your Privy tokens.
 *  - EVM: opens Lexari inside MetaMask Mobile's browser, where MetaMask signs Privy's link request.
 */
import { useIdentityToken, useLinkWithSiws, usePrivy } from "@privy-io/expo";
import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";
import { api } from "./api";
import { authorizeWallet, signMessage } from "./mwa";

export const METAMASK_DAPP = "https://metamask.app.link/dapp/app.lexari.ai/settings#wallets";

export function useWalletLink(token: string | null) {
  const privy = usePrivy();
  const siws = useLinkWithSiws();
  const { getIdentityToken } = useIdentityToken();
  const sync = async () => {
    const [idToken, accessToken] = await Promise.all([getIdentityToken().catch(() => null), privy.getAccessToken().catch(() => null)]);
    return api<{ conflicts: string[] }>("/api/wallets", { method: "POST", body: JSON.stringify({ idToken: idToken || undefined, accessToken: accessToken || undefined }) }, token);
  };
  return {
    inApp: { solana: !!privy.user, evm: false },
    link: async (f: "solana" | "evm"): Promise<string> => {
      if (f === "evm") { await Linking.openURL(METAMASK_DAPP); return "Finish linking in MetaMask. It shows here when you come back."; }
      if (!privy.user) { await WebBrowser.openAuthSessionAsync("https://app.lexari.ai/settings#wallets"); return "Wallets updated"; }
      const { address } = await authorizeWallet();
      const { message } = await siws.generateMessage({ wallet: { address }, from: { domain: "app.lexari.ai", uri: "https://app.lexari.ai" } });
      const signature = await signMessage(address, message);
      await siws.link({ signature, message, wallet: { walletClientType: "mobile_wallet_adapter", connectorType: "mobile_wallet_adapter" } });
      const r = await sync();
      return r.conflicts?.[0] || "Wallet linked";
    },
  };
}
