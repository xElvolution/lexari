"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useLogin } from "@privy-io/react-auth";

/**
 * Auth backed by Privy: Google, email, and wallet connect in one modal.
 * Exposes the same useAuth() shape the Nav/studio already consume.
 *
 * Requires NEXT_PUBLIC_PRIVY_APP_ID (dashboard.privy.io → create app →
 * enable Google, Email, Wallets). Without it the site still works — the
 * sign-in button just explains what's missing.
 */

interface User {
  email: string;
  name: string | null;
  wallet?: string | null;
}
interface AuthCtx {
  user: User | null;
  loading: boolean;
  open: (mode?: "login" | "signup") => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  open: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(Ctx);

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return (
      <Ctx.Provider
        value={{
          user: null,
          loading: false,
          open: () =>
            alert(
              "Sign-in is almost ready — add NEXT_PUBLIC_PRIVY_APP_ID (from dashboard.privy.io) to .env.local to enable Google, email and wallet login.",
            ),
          logout: async () => {},
        }}
      >
        {children}
      </Ctx.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#6C5CE7",
          walletChainType: "ethereum-only",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}

/** Adapts Privy's hooks to the stable AuthCtx shape the app consumes. */
function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin();

  const mapped: User | null =
    ready && authenticated && user
      ? {
          email:
            user.google?.email ??
            user.email?.address ??
            (user.wallet ? shortAddress(user.wallet.address) : "account"),
          name: user.google?.name ?? null,
          wallet: user.wallet?.address ?? null,
        }
      : null;

  return (
    <Ctx.Provider
      value={{
        user: mapped,
        loading: !ready,
        open: () => login(),
        logout: async () => {
          await logout();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
