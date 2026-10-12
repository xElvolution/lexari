"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { api, friendly } from "@/lib/api";
import { payFromBalance } from "@/lib/balance";
import { refreshBilling } from "@/lib/billing";
import { onMoneyChanged, startMoneySync } from "@/lib/money";
import { toast } from "@/lib/store";
import { txUrl } from "@/lib/nft";
import { MASK, useHideBalance } from "@/lib/privacy";
import { shortAddr } from "@/content/appData";
import Icon from "../Icon";
import { CoinLogo } from "../Logos";
import { AgentTile } from "../faces";
import { Sheet as Modal } from "../billing/parts";

export type Holding = { asset: string; amount: number; decimals: number; test: boolean };
export type ChainWallet = { chain: "solana" | "base" | "ethereum"; network: string; address: string; holdings: Holding[]; explorer: string };
export type AgentWallets = { slug: string; kind: string; name: string; wallets: ChainWallet[] };
export type Funding = { id: string; agent: string; chain: string; direction: "in" | "out"; asset: string; amount: number; status: string; sig: string | null; at: number };
export type HistoryRow = { id: string; kind: string; label: string; ref: string | null; delta: number; paid?: number; at: number };
export type WalletData = {
  balance?: number; history?: HistoryRow[];
  agents: AgentWallets[]; fundings: Funding[];
  chains: { id: string; name: string; live: boolean }[];
  funding: { on: boolean; network: string; amounts: number[]; max: number };
  prices: { hireUsd: number; cardUsd: number };
};

/* one shared copy per scope ("" is the whole Wallet tab, a slug is one agent's panel) */
const cache = new Map<string, WalletData | null>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const inflight = new Map<string, Promise<void>>();
export function refreshWallet(agent = "") {
  if (inflight.has(agent)) return inflight.get(agent)!;
  const p = api<WalletData>(`/api/wallet${agent ? `?agent=${encodeURIComponent(agent)}` : ""}`)
    .then((d) => { cache.set(agent, d); })
    .catch(() => { if (!cache.has(agent)) cache.set(agent, null); })
    .finally(() => { inflight.delete(agent); emit(); });
  inflight.set(agent, p);
  return p;
}
const refreshAll = () => Promise.all([...new Set(["", ...cache.keys()])].map((k) => refreshWallet(k)));
// Any money change (a top up confirmed, a payment notification, coming back to the tab) refetches the scopes on screen
// or already loaded. Nothing is fetched for a wallet view that was never opened.
onMoneyChanged(() => { const keys = [...new Set([...cache.keys(), ...(subs.size ? [""] : [])])]; keys.forEach((k) => void refreshWallet(k)); });
export function useWallet(agent = "") {
  const d = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => cache.get(agent), () => undefined);
  useEffect(() => { startMoneySync(); void refreshWallet(agent); }, [agent]);
  return d;
}

const units = (h: Holding) => h.amount / 10 ** h.decimals;
export const fmtHolding = (h: Holding) => h.asset === "USDC" ? `$${units(h).toFixed(2)}` : `${+units(h).toFixed(4)}`;
const key = () => (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");

/** Fund agent: dollars from your balance arrive in the agent's wallet as test USDC on devnet. */
export async function fundAgent(slug: string, name: string, amounts: readonly number[], usd = amounts[0] ?? 1) {
  const r = await payFromBalance({
    kind: "fund", title: `Fund ${name}`, doing: `Funding ${name}`, what: `Send dollars from your balance to ${name}'s own wallet.`, usd, amounts,
    art: <AgentTile id={slug} look={undefined} size={64} radius={22} />,
    note: "It arrives in its wallet as USDC. Anything left can come back to your balance.",
    cta: (v) => `Fund $${v} from balance`,
    run: async (v) => {
      const out = await api<{ funding: { status: string; sig: string | null } }>("/api/wallet/fund", { body: { agent: slug, usd: v, key: key() } });
      if (out.funding.status !== "sent") throw new Error("That transfer didn't go through. Your balance was refunded.");
      return out;
    },
  });
  if (r.ok) {
    const sig = (r.result as { funding: { sig: string | null } }).funding.sig;
    toast({ text: `$${r.usd} sent to ${name}'s wallet${sig ? " · confirmed" : ""}` });
    void refreshAll();
  }
  return r;
}

export async function returnToBalance(slug: string, name: string) {
  try {
    const r = await api<{ micros: number; sig: string | null }>("/api/wallet/return", { body: { agent: slug } });
    toast({ text: r.micros ? `$${(r.micros / 1e6).toFixed(2)} back in your balance from ${name}` : `${name}'s wallet has nothing to send back` });
    void refreshBilling(); void refreshAll();
    return r;
  } catch (e) { toast({ text: friendly(e, "Couldn't send it back.") }); return null; }
}

const copy = (t: string) => { void navigator.clipboard?.writeText(t).then(() => toast({ text: "Address copied" }), () => {}); };

/** One agent's own wallet: per chain, what it holds, and Fund / Return. Labelled as the agent's, never yours. */
export function AgentWalletCard({ a, name, look, funding, fundings = [], compact = false, children }: {
  a: AgentWallets; name: string; look?: unknown; funding: WalletData["funding"]; fundings?: Funding[]; compact?: boolean; children?: React.ReactNode;
}) {
  const hide = useHideBalance();
  const [back, setBack] = useState(false);
  const sol = a.wallets.find((w) => w.chain === "solana");
  const usdc = sol?.holdings.find((h) => h.asset === "USDC" && h.amount > 0);
  const last = fundings.find((f) => f.agent === a.slug);
  const [addrs, setAddrs] = useState(false);
  const evm = a.wallets.find((w) => w.chain !== "solana");
  const total = a.wallets.flatMap((w) => w.holdings).filter((h) => /USD/.test(h.asset)).reduce((x, h) => x + h.amount, 0);
  return (
    <li data-agent-wallet={a.slug} className={`list-none rounded-[22px] bg-card ring-1 ring-line ${compact ? "p-3.5" : "p-4"}`}>
      <div className="flex items-center gap-3">
        <AgentTile id={a.slug} look={look as never} size={compact ? 38 : 44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15.5px] font-bold text-ink">{name}&apos;s wallet</div>
          <div className="text-[12.5px] leading-snug text-ink/60">{a.kind === "hired" ? "Its own wallet for tasks" : "Its own wallet, separate from your balance"}</div>
        </div>
      </div>
      {sol ? (
        <div className="mt-3 rounded-2xl bg-tint p-3">
          <button data-agent-addresses onClick={() => setAddrs(true)} className="flex w-full items-center gap-2 text-left">
            <span className="min-w-0 flex-1"><span className="label block text-[8.5px] text-ink/55">Agent wallet</span><span className="tab-num block text-[20px] font-extrabold text-ink">{hide ? MASK : `$${total.toFixed(2)}`}</span></span>
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[12px] font-bold text-brand-ink ring-1 ring-line">Addresses<Icon name="right" size={11} /></span>
          </button>
          <div data-holdings className="mt-2 flex flex-wrap gap-2">
            {sol.holdings.filter((h) => h.amount > 0).length === 0 ? <span className="text-[13.5px] font-semibold text-ink/55">Empty</span>
              : sol.holdings.filter((h) => h.amount > 0).map((h) => (
                <span key={h.asset} data-holding={h.asset} className="inline-flex items-center gap-1.5 rounded-xl bg-card px-2.5 py-1.5 ring-1 ring-line">
                  <CoinLogo coin={h.asset} size={18} />
                  <span className="tab-num text-[16px] font-bold text-ink">{hide ? MASK : fmtHolding(h)}</span>
                  <span className="text-[11.5px] font-semibold text-ink/55">{h.asset}{h.test ? " (test)" : ""}</span>
                </span>
              ))}
          </div>
          {last && <a data-last-funding href={last.sig ? txUrl(last.sig) : undefined} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[12px] text-ink/55 hover:text-brand-ink">
            {(() => { const amt = hide ? MASK : `$${(last.amount / 1e6).toFixed(2)}`; return last.direction === "in" ? (last.status === "sent" ? `Funded ${amt}` : last.status === "refunded" ? `Funding of ${amt} failed and was refunded` : `Funding ${amt}…`) : `${amt} sent back to your balance`; })()}
            {" · "}{new Date(last.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{last.sig ? " · receipt" : ""}
          </a>}
        </div>
      ) : <p className="mt-3 text-[13px] text-ink/55">Wallet not set up on this server yet.</p>}
      {sol && (
        <div className="mt-3 flex gap-2">
          <button data-fund-agent={a.slug} onClick={() => void fundAgent(a.slug, name, funding.amounts)} disabled={!funding.on} className="btn btn-brand btn-sm !h-10 flex-1 disabled:opacity-50"><Icon name="plus" size={14} />Fund</button>
          {usdc && <button data-return-agent={a.slug} onClick={async () => { setBack(true); await returnToBalance(a.slug, name); setBack(false); }} disabled={back || !funding.on} className="btn btn-line btn-sm !h-10 flex-1 text-ink disabled:opacity-60">{back ? "Moving…" : "Move to balance"}</button>}
        </div>
      )}
      {!funding.on && sol && <p className="mt-2 text-[12px] text-ink/50">Funding agents isn&apos;t switched on here yet.</p>}
      {children}
      {addrs && <AddressSheet name={name} evm={evm?.address} sol={sol?.address} onClose={() => setAddrs(false)} />}
    </li>
  );
}

function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => { import("qrcode").then((Q) => Q.toString(text, { type: "svg", margin: 1, width: 150 })).then(setSvg, () => setSvg("")); }, [text]);
  return <div aria-label="QR code" className="h-[150px] w-[150px] shrink-0 overflow-hidden rounded-xl bg-white p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Every address an agent has: one EVM address for all EVM chains, its Solana address. Copy and QR for each. */
function AddressSheet({ name, evm, sol, onClose }: { name: string; evm?: string; sol?: string; onClose: () => void }) {
  const rows: [string, string, string | undefined][] = [
    ["EVM", "One address on Ethereum, Base, Monad, Hyperliquid EVM, Tempo and every other EVM chain", evm],
    ["Solana", "Solana", sol],
  ];
  return (
    <Modal label="agent-addresses" title={`${name}'s addresses`} sub="Fund agents from your balance with Fund. These are for reference." icon={<Icon name="wallet" size={20} />} onClose={onClose}>
      <div className="grid gap-3">
        {rows.filter((r) => r[2]).map(([t, d, addr]) => (
          <div key={t} data-addr-row={t} className="flex items-center gap-3 rounded-2xl bg-tint p-3 max-[430px]:flex-col max-[430px]:items-stretch">
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-bold text-ink">{t}</div>
              <div className="text-[12px] leading-snug text-ink/55">{d}</div>
              <button onClick={() => copy(addr!)} className="mt-2 flex w-full items-center gap-2 text-left"><span className="min-w-0 flex-1 break-all font-mono text-[12.5px] font-semibold text-ink">{addr}</span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card text-brand-ink ring-1 ring-line"><Icon name="copy" size={14} /></span></button>
            </div>
            <div className="max-[430px]:self-center"><Qr text={addr!} /></div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
