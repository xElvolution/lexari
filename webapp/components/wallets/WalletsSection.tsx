"use client";

import { useEffect, useRef, useState } from "react";
import { getIdentityToken, useLinkAccount, usePrivy, useUser } from "@privy-io/react-auth";
import Icon from "@/components/Icon";
import { friendly } from "@/lib/api";
import { toast, type State } from "@/lib/store";
import { forgetWallet, loadWallets, setActiveWallet, syncWallets, useWallets, type WalletsState } from "@/lib/wallets";
import { WALLET_CHAINS, chainById, clientName, type LinkedWallet, type WalletChain, type WalletFamily } from "@/content/wallets";
import { usePrivySession } from "@/components/social/SocialLinks";

const PRIVY_ON = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const shortAddr = (a: string) => `${a.slice(0, 5)}…${a.slice(-4)}`;
const TILE: Record<string, string> = { phantom: "bg-[#ab9ff2] text-white", solflare: "bg-[#fc7227] text-white", backpack: "bg-[#e33e3f] text-white", metamask: "bg-[#f6851b] text-white", coinbase_wallet: "bg-[#0052ff] text-white", rabby_wallet: "bg-[#7084ff] text-white", privy: "bg-ink text-[var(--bg)]", lexari: "bg-grape text-white" };
const CHAIN_DOT: Record<string, string> = { solana: "bg-[linear-gradient(135deg,#9945ff,#14f195)]", base: "bg-[#0052ff]", ethereum: "bg-[#627eea]", tempo: "bg-ink", hyperliquid: "bg-[#50e3c2]" };

export type WalletActions = { ready: boolean; busy: string | null; link: (f: WalletFamily) => void; unlink: (w: LinkedWallet) => void; note?: string };

function WalletTile({ w, size = 40 }: { w: LinkedWallet; size?: number }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-[13px] font-bold ${TILE[w.client] || "bg-tint text-ink"}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {w.client === "lexari" ? <Icon name="wallet" size={size * 0.48} /> : clientName(w.client).slice(0, 1)}
    </span>
  );
}

/** Settings > Wallets: wallets you linked and the withdraw-only-here rule. Chains are routes, so the chain picker is an advanced detail. */
export function WalletsPanel({ w, a }: { w: WalletsState; a: WalletActions }) {
  const [switching, setSwitching] = useState<string | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  // keep the active chain in view on narrow screens
  useEffect(() => {
    const r = rail.current, on = r?.querySelector<HTMLElement>('[data-on="1"]');
    if (r && on) r.scrollTo({ left: Math.max(0, on.offsetLeft - (r.clientWidth - on.offsetWidth) / 2), behavior: "smooth" });
  }, [w.active?.chain]);
  const active = w.active ? w.wallets.find((x) => x.address === w.active!.address) : undefined;
  const chain = w.active ? chainById(w.active.chain) : undefined;
  const pickChain = async (c: WalletChain) => {
    const target = active?.family === c.family ? active : w.wallets.find((x) => x.family === c.family);
    if (!target) { a.link(c.family); return; }
    setSwitching(c.id);
    try { await setActiveWallet(target.address, c.id); } catch (e) { toast({ text: friendly(e) }); } finally { setSwitching(null); }
  };
  const pickWallet = async (x: LinkedWallet) => {
    const c = chain?.family === x.family ? chain.id : x.family === "solana" ? "solana" : "base";
    setSwitching(x.address);
    try { await setActiveWallet(x.address, c); toast({ text: `${clientName(x.client)} is now active` }); } catch (e) { toast({ text: friendly(e) }); } finally { setSwitching(null); }
  };
  const linked = w.wallets.filter((x) => !x.login).length;
  return (
    <div data-wallets>
      <section className="grain relative overflow-hidden rounded-[22px] bg-[linear-gradient(130deg,#2a0f9a,#5b2bff_60%,#8f6bff)] p-5 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><Icon name="wallet" size={24} /></span>
          <div className="min-w-0 flex-1">
            <div className="label text-[9.5px] text-white/70">Withdrawals go to</div>
            {active ? (
              <div key={active.address + w.active?.chain} className="price-in">
                <div data-wallet-active className="display mt-1 truncate text-[26px] leading-none">{active.login ? "Sign-in wallet" : clientName(active.client)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-white/85">
                  <span className="tab-num font-mono">{shortAddr(active.address)}</span>
                  {chain && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-semibold"><span className={`h-2.5 w-2.5 rounded-full ${CHAIN_DOT[chain.id]}`} />{chain.name} {chain.network}</span>}
                </div>
              </div>
            ) : <div className="display mt-1 text-[26px] leading-none">{w.loaded ? "None yet" : "…"}</div>}
          </div>
        </div>
        <details className="mt-3 text-white/80"><summary className="cursor-pointer text-[12.5px] font-semibold">Advanced: where funds sit</summary>
        <div ref={rail} data-chain-switch className="no-bar relative -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-0.5" role="radiogroup" aria-label="Active chain">
          {WALLET_CHAINS.map((c) => {
            const on = w.active?.chain === c.id;
            const has = w.wallets.some((x) => x.family === c.family);
            return (
              <button key={c.id} role="radio" aria-checked={on} data-chain={c.id} data-on={on ? "1" : "0"} disabled={!!switching} onClick={() => void pickChain(c)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full pl-2 pr-3.5 text-[13.5px] font-semibold transition ${on ? "bg-white text-[#3a17c9] shadow-[0_4px_0_rgba(20,6,80,.35)]" : "bg-white/15 text-white hover:bg-white/25"} ${has ? "" : "opacity-70"}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full ${CHAIN_DOT[c.id]} ${switching === c.id ? "animate-pulse" : ""}`}>{on && <Icon name="check" size={12} stroke={3} className="text-white" />}</span>
                {c.name}{!has && <Icon name="plus" size={12} stroke={2.6} />}
              </button>
            );
          })}
        </div>
        </details>
      </section>

      <section className="mt-6">
        <div className="mb-1 flex items-center"><h3 className="label text-[9.5px] text-ink/50">Your wallets</h3><span className="ml-auto text-[12px] text-ink/45">{linked} linked</span></div>
        <ul data-wallet-list className="divide-y divide-[var(--line)] rounded-[22px] bg-card px-4 ring-1 ring-line sm:px-5">
          {!w.loaded && [0, 1].map((i) => <li key={i} className="py-3.5"><div className="h-10 animate-pulse rounded-2xl bg-tint" /></li>)}
          {w.wallets.map((x, i) => {
            const on = w.active?.address === x.address;
            return (
              <li key={x.address} data-wallet={x.address} data-active={on ? "1" : "0"} className="row-in py-3" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-3">
                  <button onClick={() => !on && void pickWallet(x)} aria-label={on ? "Active wallet" : `Make ${clientName(x.client)} active`} className="relative">
                    <WalletTile w={x} />
                    <span className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-[3px] ring-[var(--card,#fff)] transition-all duration-300 ${on ? "scale-100 bg-grape text-white" : "scale-0 bg-tint"}`}><Icon name="check" size={10} stroke={3} /></span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><span className="truncate text-[15px] font-semibold text-ink">{x.login ? "Sign-in wallet" : clientName(x.client)}</span>
                      <span className="rounded-md bg-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-ink/55">{x.family === "evm" ? "EVM" : "Solana"}</span>
                      {on && <span className="rounded-full bg-grape/12 px-2 py-0.5 text-[10.5px] font-bold text-brand-ink">Active</span>}</div>
                    <button onClick={() => { void navigator.clipboard?.writeText(x.address).then(() => toast({ text: "Address copied" })).catch(() => {}); }} className="tab-num mt-0.5 inline-flex items-center gap-1 font-mono text-[12px] text-ink/50 hover:text-ink"><Icon name="copy" size={11} />{shortAddr(x.address)}</button>
                  </div>
                  {x.login ? <span className="shrink-0 text-[12px] font-semibold text-ink/40">Can&apos;t unlink</span>
                    : !on && <button onClick={() => void pickWallet(x)} disabled={!!switching} className="hidden h-9 shrink-0 items-center rounded-full bg-tint px-3 text-[13px] font-semibold text-ink hover:bg-grape hover:text-white sm:inline-flex">Make active</button>}
                  {!x.login && <button data-wallet-unlink onClick={() => setAsk(ask === x.address ? null : x.address)} aria-label={`Unlink ${clientName(x.client)}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/50 hover:bg-tint hover:text-[#e5484d]"><Icon name="trash" size={15} /></button>}
                </div>
                {ask === x.address && (
                  <div className="row-in mt-2.5 rounded-2xl bg-tint p-3">
                    <p className="text-[13px] leading-snug text-ink/70">Unlink {clientName(x.client)}? Agents can&apos;t withdraw to it any more.</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setAsk(null)} className="btn btn-line btn-sm !h-9 flex-1 text-ink">Keep</button>
                      <button data-wallet-unlink-yes onClick={() => { setAsk(null); a.unlink(x); }} disabled={a.busy === x.address} className="btn btn-sm !h-9 flex-1 bg-[#e5484d] text-white">{a.busy === x.address ? "Unlinking…" : "Unlink"}</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["solana", "evm"] as const).map((f) => (
            <button key={f} data-wallet-link={f} disabled={!a.ready || !!a.busy} onClick={() => a.link(f)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-card text-[14px] font-bold text-ink ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-grape disabled:opacity-50 disabled:hover:translate-y-0">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-white ${f === "solana" ? CHAIN_DOT.solana : CHAIN_DOT.ethereum}`}><Icon name="plus" size={13} stroke={2.6} /></span>
              {a.busy === f ? "Linking…" : f === "solana" ? "Link Solana wallet" : "Link EVM wallet"}
            </button>
          ))}
        </div>
        {a.note && <p className="mt-2 text-[12.5px] leading-snug text-ink/55">{a.note}</p>}
      </section>

      <section data-wallet-rule className="mt-6 flex items-start gap-3 rounded-[22px] bg-card p-4 ring-1 ring-line">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-grape/12 text-brand-ink"><Icon name="lock" size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">Withdrawals go only to these wallets</div>
          <p className="mt-0.5 text-[13px] leading-snug text-ink/60">When an agent sends funds back to you, it can only use a wallet listed here, and each send still waits for your Confirm. Paying any other address needs &quot;Send to any address&quot;, which you turn on per integration.</p>
        </div>
      </section>
      <p className="mt-4 text-[12.5px] leading-snug text-ink/50">Privy checks each wallet is yours with a signature (no transaction, no fee). Lexari keeps only the address.</p>
    </div>
  );
}

function usePrivyWalletActions(s: State): WalletActions {
  const { ready, getAccessToken, unlinkWallet } = usePrivy();
  const { refreshUser } = useUser();
  const ensurePrivy = usePrivySession(s);
  const [busy, setBusy] = useState<string | null>(null);
  const sync = async (ok?: string) => {
    await refreshUser().catch(() => null);
    const [idToken, accessToken] = await Promise.all([getIdentityToken().catch(() => null), getAccessToken().catch(() => null)]);
    const conflicts = await syncWallets({ idToken, accessToken });
    toast({ text: conflicts[0] || ok || "Wallets updated" });
  };
  const { linkWallet } = useLinkAccount({
    onSuccess: () => { void sync("Wallet linked").catch((e) => toast({ text: friendly(e, "Linked in Privy, but Lexari couldn't confirm it. Try again.") })).finally(() => setBusy(null)); },
    onError: (err) => { setBusy(null); if (!/exited|cancel/i.test(String(err))) toast({ text: /linked_to_another_user|already/i.test(String(err)) ? "That wallet is already linked to another account." : "Linking did not finish. Try again." }); },
  });
  return {
    ready, busy,
    link: (f) => {
      setBusy(f);
      void ensurePrivy().then((ok) => { if (!ok) { setBusy(null); return; } linkWallet({ walletChainType: f === "solana" ? "solana-only" : "ethereum-only" }); })
        .catch((e) => { setBusy(null); toast({ text: friendly(e, "Could not start linking.") }); });
    },
    unlink: (w) => {
      setBusy(w.address);
      void (async () => {
        try {
          if (!(await ensurePrivy())) return;
          await unlinkWallet(w.address).catch((e) => { if (!/not.*linked|not found/i.test(String(e))) throw e; });
          await forgetWallet(w.address);
          toast({ text: `${clientName(w.client)} unlinked` });
        } catch (e) { toast({ text: /at least one|last/i.test(String(e)) ? "Keep at least one way to sign in before unlinking this wallet." : friendly(e, "Could not unlink. Try again.") }); }
        finally { setBusy(null); }
      })();
    },
  };
}
function PrivyWallets({ s, w }: { s: State; w: WalletsState }) { return <><WalletsPanel w={w} a={usePrivyWalletActions(s)} /></>; }

export default function WalletsSection({ s }: { s: State }) {
  const w = useWallets();
  useEffect(() => { void loadWallets(); }, []);
  if (PRIVY_ON) return <PrivyWallets s={s} w={w} />;
  return <><WalletsPanel w={w} a={{ ready: false, busy: null, link: () => {}, unlink: () => {}, note: "Linking wallets is not set up on this server yet." }} /></>;
}
