"use client";

/**
 * Top up with crypto: every coin in one searchable list (Lexari's own deposit networks plus every coin Aurora Intents
 * routes), then a deposit address made for you with a QR code, copy and the exact amount to send. The balance is
 * credited automatically once the deposit is final on chain, exactly once (server/topup/deposits.ts). Below the
 * address: pay from a wallet you've connected in this browser (Phantom, Solflare, MetaMask and the like).
 */
import QR from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAINS, COINS, TOPUP_MIN_USD, coinById, coinDigits, railId, RAILS, type Rail } from "@/content/topup";
import { api, friendly } from "@/lib/api";
import { depositAddress, topupInChat, type DepositView } from "@/lib/topup";
import { toast } from "@/lib/store";
import { celebrate } from "../Celebrate";
import Icon from "../Icon";
import { Spinner } from "./parts";
import { CoinLogo, ChainLogo } from "../Logos";

type AChain = { assetId: string; chain: string; chainName: string; decimals: number };
type ACoin = { symbol: string; name: string; price: number; logo: string | null; chains: AChain[] };
export type Opt = { kind: "rail"; key: string; chainName: string; chain: string } | { kind: "aurora"; assetId: string; chainName: string; chain: string };
type Entry = { symbol: string; name: string; logo: string | null; local?: string; opts: Opt[] };

const copy = (t: string, what: string) => { void navigator.clipboard?.writeText(t).then(() => toast({ text: `${what} copied` }), () => {}); };
const openRails = RAILS.filter((r) => !r.hidden && r.live && CHAINS[r.chain].live);

function useAurora() {
  const [coins, setCoins] = useState<ACoin[] | null>(null);
  useEffect(() => { api<{ coins: ACoin[] }>("/api/topup/aurora").then((r) => setCoins(r.coins), () => setCoins([])); }, []);
  return coins;
}

/** One list: Lexari deposit networks first for each coin, then the Aurora Intents networks. */
export function useEntries() {
  const aurora = useAurora();
  return useMemo(() => {
    const by = new Map<string, Entry>();
    for (const r of openRails) {
      const c = coinById(r.coin)!;
      const k = c.symbol.toUpperCase();
      const e = by.get(k) || { symbol: c.symbol, name: c.name, logo: null, local: c.id, opts: [] };
      e.opts.push({ kind: "rail", key: railId(r), chainName: CHAINS[r.chain].name, chain: r.chain });
      by.set(k, e);
    }
    for (const a of aurora || []) {
      const k = a.symbol.toUpperCase();
      const e = by.get(k) || { symbol: a.symbol, name: a.name, logo: a.logo, opts: [] };
      if (!e.logo && !e.local) e.logo = a.logo;
      const have = new Set(e.opts.map((o) => o.chainName.toLowerCase()));
      for (const x of a.chains) if (!have.has(x.chainName.toLowerCase())) e.opts.push({ kind: "aurora", assetId: x.assetId, chainName: x.chainName, chain: x.chain });
      by.set(k, e);
    }
    const order = COINS.map((c) => c.symbol.toUpperCase());
    const list = [...by.values()].sort((a, b) => {
      const i = order.indexOf(a.symbol.toUpperCase()), j = order.indexOf(b.symbol.toUpperCase());
      return (i < 0 ? 999 : i) - (j < 0 ? 999 : j) || a.symbol.localeCompare(b.symbol);
    });
    return { list, loading: aurora === null };
  }, [aurora]);
}

function Mark({ e, size = 34 }: { e: Entry; size?: number }) {
  if (e.local) return <CoinLogo coin={e.local} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return e.logo ? <img src={e.logo} alt="" width={size} height={size} className="shrink-0 rounded-full bg-tint object-cover" style={{ width: size, height: size }} /> : <span className="grid shrink-0 place-items-center rounded-full bg-tint text-[12px] font-bold text-ink/70" style={{ width: size, height: size }}>{e.symbol.slice(0, 3)}</span>;
}

/** Search every coin, then pick the network. */
export function AllCoinPicker({ onPick, onBack }: { onPick: (o: Opt, e: { symbol: string; name: string; logo: string | null; local?: string }) => void; onBack: () => void }) {
  const { list, loading } = useEntries();
  const [q, setQ] = useState("");
  const [coin, setCoin] = useState<Entry | null>(null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((e) => !s || `${e.symbol} ${e.name} ${e.opts.map((o) => o.chainName).join(" ")}`.toLowerCase().includes(s));
  }, [q, list]);
  if (coin) {
    return (
      <div data-chain-picker>
        <button onClick={() => setCoin(null)} className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-ink/60 hover:text-ink"><Icon name="back" size={15} />All coins</button>
        <div className="mb-3 flex items-center gap-2.5"><Mark e={coin} /><div><div className="text-[15px] font-bold text-ink">{coin.symbol}</div><div className="text-[12px] text-ink/55">Choose the network you&apos;ll send on</div></div></div>
        <div className="grid gap-1.5">
          {coin.opts.map((o) => (
            <button key={o.kind === "rail" ? o.key : o.assetId} data-net-opt={o.chainName} onClick={() => onPick(o, coin)} className="flex w-full items-center gap-3 rounded-[16px] bg-card p-3 text-left ring-1 ring-line transition hover:ring-grape/50">
              <ChainLogo chain={o.chain} size={30} />
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-ink">{o.chainName}</span><span className="block truncate text-[11.5px] text-ink/55">{o.kind === "rail" ? CHAINS[railChain(o.key)].network : "Converted to dollars on arrival"}</span></span>
              <Icon name="right" size={13} className="shrink-0 text-ink/35" />
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div data-coin-picker>
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint text-ink/70"><Icon name="back" size={16} /></button>
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-tint px-3.5 ring-1 ring-line focus-within:ring-grape">
          <Icon name="search" size={15} className="text-ink/45" />
          <input data-coin-search autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${list.length ? `${list.length} coins` : "coins"} or networks`} className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink/40" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {shown.map((e) => (
          <button key={e.symbol} data-coin={e.symbol} onClick={() => (e.opts.length === 1 ? onPick(e.opts[0], e) : setCoin(e))} className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition hover:bg-tint">
            <Mark e={e} />
            <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold text-ink">{e.symbol}</span><span className="block truncate text-[12px] text-ink/55">{e.name}</span></span>
            <span className="max-w-[46%] truncate text-right text-[11.5px] text-ink/50">{e.opts.length > 1 ? `${e.opts.length} networks` : e.opts[0].chainName}</span>
            <Icon name="right" size={13} className="shrink-0 text-ink/35" />
          </button>
        ))}
        {loading && <p className="flex items-center justify-center gap-2 py-4 text-[13px] text-ink/50"><Spinner />Loading every coin…</p>}
        {!loading && !shown.length && <p className="py-6 text-center text-[13px] text-ink/50">No coin matches “{q}”.</p>}
      </div>
    </div>
  );
}
const railChain = (key: string) => key.split(":")[1] as Rail["chain"];

function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => { QR.toString(text, { type: "svg", margin: 1, width: 180 }).then(setSvg, () => setSvg("")); }, [text]);
  return <div data-deposit-qr aria-label="QR code" className="mx-auto h-[180px] w-[180px] overflow-hidden rounded-2xl bg-white p-1.5 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function AddressBox({ address, memo, label }: { address: string; memo?: string | null; label: string }) {
  return (
    <div className="rounded-2xl bg-tint p-3.5">
      <Qr text={address} />
      <div className="label mt-3 text-[9.5px] text-ink/50">{label}</div>
      <button data-deposit-address onClick={() => copy(address, "Address")} className="mt-1.5 flex w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1 break-all font-mono text-[13px] font-semibold leading-snug text-ink">{address}</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-brand-ink ring-1 ring-line"><Icon name="copy" size={15} /></span>
      </button>
      {memo && (
        <button onClick={() => copy(memo, "Memo")} className="mt-2.5 flex w-full items-center gap-2 rounded-xl bg-card p-2.5 text-left ring-1 ring-grape/40">
          <span className="min-w-0 flex-1"><span className="block text-[10.5px] font-bold uppercase tracking-wide text-ink/50">Memo / tag (required)</span><span className="block break-all font-mono text-[15px] font-bold text-ink">{memo}</span></span>
          <Icon name="copy" size={15} className="text-brand-ink" />
        </button>
      )}
    </div>
  );
}

function Exact({ amount, symbol, usd }: { amount: string; symbol: string; usd: number }) {
  return (
    <button data-exact-amount onClick={() => copy(amount, "Amount")} className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-card p-3.5 text-left ring-1 ring-line">
      <span><span className="block text-[11.5px] text-ink/55">Send exactly</span><span className="block text-[18px] font-extrabold tabular-nums text-ink">{amount} {symbol}</span><span className="block text-[11.5px] text-ink/55">for ${usd.toFixed(2)} on your balance</span></span>
      <Icon name="copy" size={15} className="text-brand-ink" />
    </button>
  );
}

function Status({ v, added, symbol, fmt }: { v: DepositView | null; added: { usd: number } | null; symbol: string; fmt: (n: number) => string }) {
  return (
    <div data-deposit-status className={`mt-3 flex items-center gap-2.5 rounded-2xl p-3 text-[13px] font-semibold ${added ? "bg-grape text-white" : "bg-card text-ink ring-1 ring-line"}`} aria-live="polite">
      {added ? <><Icon name="check" size={17} />${added.usd.toFixed(2)} added to your balance</>
        : v?.status === "incoming" ? <><Spinner />{v.incoming ? `${fmt(v.incoming)} ${symbol} on its way, confirming…` : "Arrived, confirming…"}</>
        : v?.status === "below" ? <><Icon name="info" size={16} />Arrived, but under ${TOPUP_MIN_USD}. Send the rest and it&apos;s added together.</>
        : v?.status === "capped" ? <><Icon name="info" size={16} />Arrived. Test top ups are capped at $50 a day; it&apos;s added tomorrow.</>
        : <><i className="h-2 w-2 animate-pulse rounded-full bg-grape" />Waiting for your payment. It&apos;s added automatically.</>}
    </div>
  );
}

/** Polls a deposit rail and celebrates the credit once. */
function useWatch(rail: string | null, note: (usd: number) => string) {
  const [v, setV] = useState<DepositView | null>(null);
  const [added, setAdded] = useState<{ usd: number; amount: number } | null>(null);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useCallback(async (first: boolean) => {
    if (!rail) return;
    try {
      const d = await depositAddress(rail, !first);
      setV(d); setErr("");
      if (d.credited) { setAdded(d.credited); void topupInChat({ creditId: d.credited.id }); celebrate({ confetti: true, title: `$${d.credited.usd.toFixed(2)} added to your balance`, body: note(d.credited.usd) }); }
    } catch (e) { setErr(friendly(e, "Couldn't reach that network right now. We'll keep trying.")); }
  }, [rail, note]);
  useEffect(() => {
    let live = true;
    setV(null); setAdded(null);
    const loop = async (first: boolean) => { await tick(first); if (live && rail) timer.current = setTimeout(() => void loop(false), /bitcoin|litecoin/.test(rail) ? 20_000 : 8_000); };
    void loop(true);
    return () => { live = false; if (timer.current) clearTimeout(timer.current); };
  }, [tick, rail]);
  return { v, added, err, check: () => tick(false) };
}

/** A Lexari deposit network: your own address on that chain. */
export function RailPay({ usd, railKey }: { usd: number; railKey: string }) {
  const r = RAILS.find((x) => railId(x) === railKey)!;
  const c = coinById(r.coin)!;
  const ch = CHAINS[r.chain];
  const fmt = useCallback((n: number) => (+n.toFixed(coinDigits(r))).toLocaleString("en-US", { maximumFractionDigits: coinDigits(r), useGrouping: false }), [r]);
  const note = useCallback(() => `${c.symbol} arrived on ${ch.network}.`, [c.symbol, ch.network]);
  const { v, added, err, check } = useWatch(railKey, note);
  const [checking, setChecking] = useState(false);
  const amount = v?.price ? fmt(Math.max(usd / v.price, r.min)) : "";
  return (
    <div data-deposit-pay={railKey}>
      <Warn symbol={c.symbol} network={ch.network} tag={!!r.tag} />
      <div className="mt-3">{v ? <AddressBox address={v.address} memo={v.tag !== undefined ? String(v.tag) : null} label={r.tag ? "Lexari XRP address" : `Your ${ch.name} deposit address`} /> : <div className="flex items-center gap-2 rounded-2xl bg-tint p-4 text-[13px] text-ink/55"><Spinner />Making your address…</div>}</div>
      {amount && <Exact amount={amount} symbol={c.symbol} usd={usd} />}
      <Status v={v} added={added} symbol={c.symbol} fmt={fmt} />
      {err && <p role="alert" className="mt-2 text-[12.5px] text-[#e5484d]">{err}</p>}
      {!added && <button data-deposit-check onClick={async () => { setChecking(true); await check(); setChecking(false); }} disabled={checking || !v} className="btn btn-ghost btn-sm mt-3 w-full !h-10">{checking ? <><Spinner className="mr-2" />Checking {ch.name}…</> : "I've sent it, check now"}</button>}
      {v && amount && !added && (ch.family === "evm" || ch.family === "solana") && <WalletPay rail={r} to={v.address} amount={amount} />}
    </div>
  );
}

/** Any coin Aurora Intents routes: a one-time address; Aurora converts it to dollars on your balance. */
export function AuroraPay({ usd, assetId, symbol }: { usd: number; assetId: string; symbol: string }) {
  const [a, setA] = useState<{ address: string; memo: string | null; amount: number; chain: string; receive: string; watch: string } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setA(null); setErr("");
    api<NonNullable<typeof a>>("/api/topup/aurora", { body: { assetId, usd } }).then(setA, (e) => setErr(friendly(e, "Couldn't get an address for that coin. Try another.")));
  }, [assetId, usd]);
  const note = useCallback(() => `Your ${symbol} arrived and was converted.`, [symbol]);
  const { v, added } = useWatch(a?.watch ?? null, note);
  return (
    <div data-aurora-pay={assetId}>
      {a && <Warn symbol={symbol} network={a.chain} tag={!!a.memo} />}
      <div className="mt-3">{a ? <AddressBox address={a.address} memo={a.memo} label={`Your ${symbol} deposit address on ${a.chain}`} /> : err ? null : <div className="flex items-center gap-2 rounded-2xl bg-tint p-4 text-[13px] text-ink/55"><Spinner />Making your address…</div>}</div>
      {a && <Exact amount={String(a.amount)} symbol={symbol} usd={usd} />}
      {a && <p className="mt-2 text-[11.5px] leading-snug text-ink/50">Converted to dollars by Aurora Intents when it arrives (about ${a.receive}). This address is for this top up only; if it can&apos;t be converted, it&apos;s refunded.</p>}
      {a && <Status v={v} added={added} symbol="USDC" fmt={(n) => n.toFixed(2)} />}
      {err && <p role="alert" className="mt-3 rounded-2xl bg-[#fde8e8] p-3 text-[13px] font-semibold text-[#b42318]">{err}</p>}
    </div>
  );
}

function Warn({ symbol, network, tag }: { symbol: string; network: string; tag: boolean }) {
  return (
    <div data-network-warn className="flex gap-2.5 rounded-2xl bg-[#fff4d6] p-3 text-[12.5px] leading-snug text-[#5c4300] ring-1 ring-[#f5d27a]">
      <Icon name="info" size={16} className="mt-0.5 shrink-0" />
      <span>Send only <b>{symbol}</b> on <b>{network}</b>.{tag ? <> Include the <b>memo / tag</b> or it can&apos;t be credited.</> : " Anything sent on another network is lost."}</span>
    </div>
  );
}

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
type Sol = { connect: () => Promise<{ publicKey: { toBase58: () => string } }>; signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }> };
const injected = () => {
  const w = window as unknown as { ethereum?: Eth; solana?: Sol; phantom?: { solana?: Sol }; solflare?: Sol };
  return { eth: w.ethereum, sol: w.phantom?.solana || w.solflare || w.solana };
};

/** Pay from a wallet connected in this browser, to your own deposit address. You sign in your wallet. */
function WalletPay({ rail, to, amount }: { rail: Rail; to: string; amount: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fam = CHAINS[rail.chain].family;
  const [has, setHas] = useState(false);
  useEffect(() => { const i = injected(); setHas(fam === "evm" ? !!i.eth : !!i.sol); }, [fam]);
  const atoms = () => { const [w, f = ""] = amount.split("."); return BigInt(w + (f + "0".repeat(rail.decimals)).slice(0, rail.decimals)); };
  const go = async () => {
    setBusy(true); setMsg("");
    try {
      const i = injected();
      if (fam === "evm") {
        const eth = i.eth!;
        const [from] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        const id = `0x${CHAINS[rail.chain].chainId!.toString(16)}`;
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: id }] });
        const tx = rail.token
          ? { from, to: rail.token, data: `0xa9059cbb${to.toLowerCase().replace(/^0x/, "").padStart(64, "0")}${atoms().toString(16).padStart(64, "0")}` }
          : { from, to, value: `0x${atoms().toString(16)}` };
        await eth.request({ method: "eth_sendTransaction", params: [tx] });
      } else {
        const sol = i.sol!;
        const { publicKey } = await sol.connect();
        const web3 = await import("@solana/web3.js");
        const { rpcConnection } = await import("@/lib/rpc");
        const conn = rpcConnection();
        const from = new web3.PublicKey(publicKey.toBase58()), dest = new web3.PublicKey(to);
        const tx = new web3.Transaction();
        if (!rail.token) tx.add(web3.SystemProgram.transfer({ fromPubkey: from, toPubkey: dest, lamports: Number(atoms()) }));
        else {
          const spl = await import("@solana/spl-token");
          const mint = new web3.PublicKey(rail.token);
          const a = spl.getAssociatedTokenAddressSync(mint, from), b = spl.getAssociatedTokenAddressSync(mint, dest);
          tx.add(spl.createAssociatedTokenAccountIdempotentInstruction(from, b, dest, mint), spl.createTransferCheckedInstruction(a, mint, b, from, atoms(), rail.decimals));
        }
        tx.feePayer = from; tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
        await sol.signAndSendTransaction(tx);
      }
      setMsg("Sent. It's added to your balance as soon as it confirms.");
    } catch (e) { setMsg(friendly(e, "The wallet didn't send it.")); }
    setBusy(false);
  };
  return (
    <div data-wallet-pay className="mt-4 border-t border-[var(--line)] pt-4">
      <div className="label text-[9.5px] text-ink/50">Or</div>
      <button onClick={go} disabled={busy || !has} className="btn btn-brand btn-sm mt-2 w-full disabled:opacity-60">{busy ? <><Spinner className="mr-2" />Waiting for your wallet…</> : "Pay from connected wallet"}</button>
      <p className="mt-1.5 text-center text-[11.5px] text-ink/50">{has ? `Sends ${amount} ${coinById(rail.coin)?.symbol} from your ${fam === "evm" ? "EVM" : "Solana"} wallet to the address above. You approve it in the wallet.` : `Open Lexari in your wallet's browser (Phantom, MetaMask…) to pay from it, or scan the QR code.`}</p>
      {msg && <p className="mt-2 text-center text-[12.5px] font-semibold text-ink/70">{msg}</p>}
    </div>
  );
}
