/** One shared snapshot of the account, from the same endpoints the web app reads (/api/me, /api/hub/state, /api/wallet). */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";

export type Agent = { slug: string; kind: string; name: string; role?: string; look?: unknown; meta?: Record<string, unknown>; skills?: string[]; about?: string; createdAt?: number };
export type Msg = { id: string; from: string; text?: string; at: number; call?: number; voice?: number; file?: { name: string; size?: number } };
export type Chat = { slug: string; kind: string; title: string; members: string[]; messages: Msg[]; createdAt?: number };
export type Me = {
  user: { wallet?: string; referralCode?: string; method?: string; email?: string | null; createdAt?: number };
  profile: { name?: string; username?: string; avatar?: string };
  plan: { id: string; name: string; seats: number };
  prefs?: { defaultAgent?: string; hideBalance?: boolean; language?: string; voice?: string };
  agents: Agent[]; chats: Chat[]; jobs?: { id: string; assignee?: string; title?: string; prompt: string; status: string; output?: string; startedAt: number; finishedAt?: number }[];
  memories?: { id: string; agent?: string; tag?: string; source?: string; at: number }[]; hires?: unknown[];
};
export type Quest = { id: string; period: string; goal: number; reward: number; progress: number; claimed: boolean };
export type HubState = { program?: { live: boolean }; player?: { coins: number; lifetime: number; streak: number; checkedInToday: boolean; lastCheckIn?: number } | null; levels?: { slug: string; name: string; level: number; xp: number }[]; quests?: Quest[]; achievements?: { id: string; done?: boolean }[]; referrals?: number; box?: { openedToday?: boolean } };
export type Holding = { asset: string; amount: number; decimals: number; test?: boolean };
export type Wallet = { balance: number; history: { id: string; kind: string; label: string; delta: number; at: number }[]; agents: { slug: string; kind: string; name: string; wallets: { chain: string; network: string; address: string; holdings: Holding[]; explorer?: string }[] }[] };

type D = { me: Me | null; hub: HubState | null; wallet: Wallet | null; error: string; reload: () => Promise<void> };
const Ctx = createContext<D>({ me: null, hub: null, wallet: null, error: "", reload: async () => {} });

export function DataProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [hub, setHub] = useState<HubState | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!token) return;
    const [a, b, c] = await Promise.allSettled([api<Me>("/api/me", {}, token), api<HubState>("/api/hub/state", {}, token), api<Wallet>("/api/wallet", {}, token)]);
    if (a.status === "fulfilled") setMe(a.value); if (b.status === "fulfilled") setHub(b.value); if (c.status === "fulfilled") setWallet(c.value);
    setError(a.status === "rejected" ? "Couldn't reach Lexari. Pull to retry." : "");
  }, [token]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return <Ctx.Provider value={{ me, hub, wallet, error, reload }}>{children}</Ctx.Provider>;
}
export const useData = () => useContext(Ctx);

export const primaryOf = (me: Me | null) => me?.prefs?.defaultAgent || "home";
export const nameOf = (me: Me | null, slug: string) => me?.agents.find((a) => a.slug === slug)?.name || slug;
export const youName = (me: Me | null) => me?.profile?.name || (me?.agents.find((a) => a.slug === "home")?.meta?.you as string | undefined) || "You";
export const initialsOf = (me: Me | null) => { const n = youName(me); return n === "You" ? "Y" : n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(); };
