import { useLocalSearchParams } from "expo-router";
/** Port of webapp/components/wallet/WalletsView.tsx at phone width: Wallet / Cards tabs, Lexari balance (Top up, History), each agent's wallet (Fund, Move to balance). */
import { useEffect, useState } from "react";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { env } from "@/lib/env";
import { signAndSend } from "@/lib/mwa";
import { Image, Linking, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import Icon from "@/components/Icon";
import { COINS } from "@/content/roster";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { AgentTile, F, GRAPE, Label, Pill, Segs, T, WSheet, ringOf, short, useC } from "@/web/kit";
import { primaryOf, useData, type Wallet } from "@/web/data";

const usd = (micros: number) => `$${(Math.max(0, micros) / 1e6).toFixed(2)}`;
const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default function Wallets() {
  const k = useC();
  const { token } = useSession();
  const { me, wallet, reload } = useData();
  const { hideBalances, toggleBalances } = usePrefs();
  const [tab, setTab] = useState<"wallet" | "cards">("wallet");
  const qp = useLocalSearchParams<{ topup?: string }>();
  const [sheet, setSheet] = useState<"topup" | "history" | null>(qp.topup ? "topup" : null);
  const [fund, setFund] = useState<{ slug: string; name: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const primary = primaryOf(me);
  const say = (t: string) => { setNote(t); setTimeout(() => setNote(""), 2800); };
  const back = async (slug: string, name: string) => {
    if (!token) return; setBusy(`back:${slug}`);
    try { const r = await api<{ micros: number }>("/api/wallet/return", { method: "POST", body: JSON.stringify({ agent: slug }) }, token); say(r.micros ? `${usd(r.micros)} back in your balance from ${name}` : `${name}'s wallet has nothing to send back`); await reload(); }
    catch { say("Couldn't send it back."); } finally { setBusy(""); }
  };
  const list = (wallet?.agents ?? []).slice().sort((a, b) => (a.slug === primary ? -1 : b.slug === primary ? 1 : 0));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 18, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={k.ink} />}>
        <Label>Money</Label>
        <T f="display" s={20.5} style={{ marginTop: 10, letterSpacing: -1.1 }}>Wallet.</T>
        <T s={15} c={k.ink75} style={{ marginTop: 8, lineHeight: 21 }}>Your Lexari balance, and the wallets your agents hold.</T>
        <Segs style={{ marginTop: 16, alignSelf: "flex-start", width: 220 }} on={tab} set={setTab} items={[{ k: "wallet", label: "Wallet", icon: "wallet" }, { k: "cards", label: "Cards", icon: "idcard" }]} />

        {tab === "wallet" ? (
          <>
            <View style={{ marginTop: 16, borderRadius: 26, backgroundColor: GRAPE, padding: 18, overflow: "hidden" }}>
              <View style={{ position: "absolute", right: -40, top: -50, width: 170, height: 170, borderRadius: 85, borderWidth: 22, borderColor: "rgba(255,255,255,0.07)" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Label c="rgba(255,255,255,0.8)">Lexari balance</Label>
                <Pressable accessibilityLabel={hideBalances ? "Show balance" : "Hide balance"} onPress={toggleBalances} style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}><Icon name={hideBalances ? "eyeoff" : "eye"} size={14} color="#fff" /></Pressable>
              </View>
              <T f="xbold" s={30} c="#fff" style={{ marginTop: 10 }}>{wallet ? (hideBalances ? "••••" : usd(wallet.balance)) : "…"}</T>
              <T s={13.5} c="rgba(255,255,255,0.8)" style={{ marginTop: 10, lineHeight: 19 }}>Pays for AI usage past your plan, hires, agent cards and funding your agents.</T>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 18 }}>
                <Pill kind="light" label="Top up" icon="plus" h={44} style={{ flex: 1, backgroundColor: "#fff" }} onPress={() => setSheet("topup")} />
                <Pressable onPress={() => setSheet("history")} style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name="clock" size={16} color="#fff" /><T f="bold" s={14} c="#fff">History</T>
                  {wallet?.history.length ? <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}><T f="bold" s={11} c="#fff">{String(wallet.history.length)}</T></View> : null}
                </Pressable>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 22 }}><T f="bold" s={16}>{"Your agents' wallets"}</T><T s={12.5} c={k.ink45}>One per agent</T></View>
            <T s={13} c={k.ink60} style={{ marginTop: 4, lineHeight: 18 }}>{"Each agent holds its own funds for tasks. Fund one from your balance; what's left can come back."}</T>
            {!wallet ? <T s={14} c={k.ink60} style={{ marginTop: 12 }}>Loading…</T> : null}
            {list.map((a) => {
              const w = a.wallets[0]; const held = (w?.holdings ?? []).filter((h) => h.amount > 0); const agent = me?.agents.find((x) => x.slug === a.slug);
              const last = wallet?.history.find((h) => h.kind === "fund" && h.label.includes(a.name));
              return (
                <View key={a.slug} style={{ marginTop: 12, borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <AgentTile slug={a.slug} look={agent?.look} size={40} ring={ringOf(a.slug, a.kind, primary)} />
                    <View style={{ flex: 1 }}><T f="bold" s={15}>{`${a.name}'s wallet`}</T><T s={12.5} c={k.ink60}>{a.slug === primary ? "Its own wallet, separate from your balance" : "Its own wallet for tasks"}</T></View>
                    {w?.network === "devnet" ? <View style={{ backgroundColor: "#ffd84d", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Label s={8.5} c="#0a0a0a">Test funds</Label></View> : null}
                  </View>
                  {w ? (
                    <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: k.tint, padding: 12 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Label c={k.ink60}>{`Solana ${w.network}`}</Label>
                        <Pressable onPress={async () => { await Clipboard.setStringAsync(w.address); say("Address copied"); }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <T s={11.5} c={k.ink75} style={{ fontFamily: F.mono }}>{short(w.address)}</T>
                          <Pressable accessibilityLabel="Open in explorer" onPress={() => w.explorer && Linking.openURL(w.explorer)}><Icon name="arrow" size={13} color={k.ink60} /></Pressable>
                        </Pressable>
                      </View>
                      {held.length ? held.map((h) => (
                        <View key={h.asset} style={{ marginTop: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: k.line, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Image source={COINS.find((c) => c.id === h.asset)?.logo} style={{ width: 20, height: 20, borderRadius: 10 }} />
                          <T f="bold" s={14}>{`$${(h.amount / 10 ** h.decimals).toFixed(2)}`}</T><T s={11.5} c={k.ink60}>{`${h.asset}${h.test ? " (test)" : ""}`}</T>
                        </View>
                      )) : <T s={13} c={k.ink60} style={{ marginTop: 10 }}>Empty</T>}
                      {last ? <T s={11.5} c={k.ink45} style={{ marginTop: 8 }}>{`Funded ${usd(-last.delta)} · ${day(last.at)} · receipt`}</T> : null}
                    </View>
                  ) : <T s={13} c={k.ink60} style={{ marginTop: 10 }}>Wallet not set up on this server yet.</T>}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <Pill label="Fund" icon="plus" h={42} style={{ flex: 1 }} onPress={() => setFund({ slug: a.slug, name: a.name })} />
                    {held.length ? <Pill kind="outline" label={busy === `back:${a.slug}` ? "Moving…" : "Move to balance"} h={42} style={{ flex: 1 }} onPress={() => back(a.slug, a.name)} /> : null}
                  </View>
                </View>
              );
            })}
            <T s={12} c={k.ink45} style={{ marginTop: 16, lineHeight: 17 }}>Test funds on Solana devnet, not real money. Base and Ethereum wallets are coming later.</T>
          </>
        ) : (
          <View style={{ marginTop: 16 }}>
            <T s={13.5} c={k.ink60} style={{ lineHeight: 19 }}>A card lets an agent pay for tools and compute inside a limit you set. Each agent gets its own.</T>
            {(me?.agents ?? []).map((a) => (
              <View key={a.slug} style={{ marginTop: 12, borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <AgentTile slug={a.slug} look={a.look} size={40} ring={ringOf(a.slug, a.kind, primary)} />
                <View style={{ flex: 1 }}><T f="bold" s={15}>{a.name}</T><T s={12.5} c={k.ink60}>No card yet</T></View>
                <Pill kind="ghost" h={34} fs={13} label="Get a card" onPress={() => Linking.openURL("https://app.lexari.ai/wallets?tab=cards")} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {note ? <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: k.ink, borderRadius: 16, padding: 12 }}><T f="semi" s={13.5} c={k.bg}>{note}</T></View> : null}
      <TopUpSheet open={sheet === "topup"} onClose={() => setSheet(null)} />
      <HistorySheet open={sheet === "history"} onClose={() => setSheet(null)} wallet={wallet} onTopUp={() => setSheet("topup")} />
      <FundSheet who={fund} onClose={() => setFund(null)} onDone={(t) => { say(t); reload(); }} />
    </View>
  );
}

const H_ICON: Record<string, string> = { topup_card: "plus", topup_crypto: "plus", dev_grant: "plus", refund: "check", fund_refund: "check", fund_return: "check", hire: "user", card: "file", fund: "wallet", plan: "star", usage: "spark" };
const MONEY_IN = new Set(["topup_card", "topup_crypto", "dev_grant", "refund", "fund_refund", "fund_return"]);
const hTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const monthOf = (t: number) => new Date(t).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
/** Port of wallet/HistorySheet.tsx: grape wallet tile, eye toggle, Added/Spent tiles, rows grouped by month. */
function HistorySheet({ open, onClose, wallet, onTopUp }: { open: boolean; onClose: () => void; wallet: Wallet | null; onTopUp: () => void }) {
  const k = useC();
  const { hideBalances, toggleBalances } = usePrefs();
  const mask = (v: string) => (hideBalances ? "••••" : v);
  const rows = wallet?.history ?? [];
  const added = rows.filter((r) => r.delta > 0).reduce((a, r) => a + r.delta, 0); const spent = rows.filter((r) => r.delta < 0).reduce((a, r) => a - r.delta, 0);
  const groups: { month: string; items: typeof rows }[] = [];
  for (const r of rows) { const m = monthOf(r.at); if (groups[groups.length - 1]?.month !== m) groups.push({ month: m, items: [] }); groups[groups.length - 1].items.push(r); }
  return (
    <WSheet open={open} title="History" icon="wallet" sub={rows.length ? `${rows.length} item${rows.length === 1 ? "" : "s"} on your Lexari balance` : "Everything your balance does shows here."} onClose={onClose}
      right={<Pressable accessibilityLabel={hideBalances ? "Show balance" : "Hide balance"} onPress={toggleBalances} style={{ marginTop: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name={hideBalances ? "eyeoff" : "eye"} size={14} color={k.ink75} /></Pressable>}>
      {rows.length ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#e7f8ee", paddingHorizontal: 14, paddingVertical: 10 }}><T f="semi" s={11.5} c="#137a3d" style={{ opacity: 0.8 }}>Added</T><T f="bold" s={15} c="#137a3d">{mask(`+${usd(added)}`)}</T></View>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: k.tint, paddingHorizontal: 14, paddingVertical: 10 }}><T f="semi" s={11.5} c={k.ink60}>Spent</T><T f="bold" s={15}>{mask(`\u2212${usd(spent)}`)}</T></View>
          </View>
          <View style={{ height: 1, backgroundColor: k.line, marginTop: 12, marginHorizontal: -16 }} />
          {groups.map((g) => (
            <View key={g.month}>
              <Label s={9} c={k.ink45} style={{ paddingTop: 16, paddingBottom: 4 }}>{g.month}</Label>
              {g.items.map((r, i) => { const up = r.delta > 0 || (MONEY_IN.has(r.kind) && r.delta >= 0); return (
                <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: k.line }}>
                  <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: up ? "#e7f8ee" : r.kind === "plan" ? "rgba(91,43,255,0.15)" : k.tint }}><Icon name={H_ICON[r.kind] || "wallet"} size={16} color={up ? "#137a3d" : r.kind === "plan" ? k.brandInk : k.ink75} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}><T f="semi" s={14} lines={1}>{r.label}</T><T s={12} c={k.ink45} lines={1}>{r.kind === "usage" ? `${day(r.at)} · AI usage that day` : `${day(r.at)}, ${hTime(r.at)}`}</T></View>
                  <T f="bold" s={14} c={up ? "#1fbf6a" : k.ink}>{r.delta === 0 ? "" : mask(`${r.delta > 0 ? "+" : "\u2212"}${usd(Math.abs(r.delta))}`)}</T>
                </View>
              ); })}
            </View>
          ))}
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: "rgba(91,43,255,0.12)", alignItems: "center", justifyContent: "center" }}><Icon name="wallet" size={26} color={k.brandInk} /></View>
          <T f="bold" s={16} style={{ marginTop: 16 }}>Nothing here yet</T>
          <T s={13} c={k.ink60} style={{ textAlign: "center", marginTop: 4, maxWidth: 280 }}>Top ups, plans, hires, agent funding and refunds will show up here as they happen.</T>
          <Pill label="Top up" icon="plus" h={40} style={{ marginTop: 20 }} onPress={() => { onClose(); onTopUp(); }} />
        </View>
      )}
    </WSheet>
  );
}

function FundSheet({ who, onClose, onDone }: { who: { slug: string; name: string } | null; onClose: () => void; onDone: (t: string) => void }) {
  const k = useC();
  const { token } = useSession();
  const [v, setV] = useState(5);
  const [busy, setBusy] = useState(false);
  if (!who) return null;
  const go = async () => {
    if (!token) return; setBusy(true);
    try { await api("/api/wallet/fund", { method: "POST", body: JSON.stringify({ agent: who.slug, usd: v, key: `${Date.now()}-${Math.random().toString(36).slice(2)}` }) }, token); onDone(`$${v} sent to ${who.name}'s wallet`); onClose(); }
    catch { onDone("That transfer didn't go through. Your balance was refunded."); } finally { setBusy(false); }
  };
  return (
    <WSheet open title={`Fund ${who.name}`} onClose={onClose}>
      <T s={13.5} c={k.ink60}>{`Send dollars from your balance to ${who.name}'s own wallet.`}</T>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        {[1, 5, 10, 25].map((n) => <Pressable key={n} onPress={() => setV(n)} style={{ flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: v === n ? GRAPE : k.tint }}><T f="bold" s={15} c={v === n ? "#fff" : k.ink}>{`$${n}`}</T></Pressable>)}
      </View>
      <T s={12.5} c={k.ink45} style={{ marginTop: 12, lineHeight: 17 }}>Test funds on Solana devnet: it arrives as test USDC, not real money. Anything left can come back to your balance.</T>
      <Pill label={busy ? `Funding ${who.name}` : `Fund $${v} from balance`} h={48} style={{ marginTop: 14 }} disabled={busy} onPress={go} />
    </WSheet>
  );
}

type CryptoReq = { id: string; recipient: string; mint: string; reference: string; amountMinor: number; decimals: number; url: string; expiresAt: number };
const RPC = () => (env.cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), ATA = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const ataOf = (owner: PublicKey, mint: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), mint.toBuffer()], ATA)[0];
/** The USDC payment the web builds with spl-token, by hand: create the treasury's token account if needed, then transferChecked with the reference key. */
function usdcTx(me: PublicKey, r: CryptoReq) {
  const mint = new PublicKey(r.mint), to = new PublicKey(r.recipient), from = ataOf(me, mint), toAta = ataOf(to, mint);
  const create = new TransactionInstruction({ programId: ATA, data: Buffer.from([1]), keys: [
    { pubkey: me, isSigner: true, isWritable: true }, { pubkey: toAta, isSigner: false, isWritable: true }, { pubkey: to, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: TOKEN, isSigner: false, isWritable: false }] });
  const data = Buffer.alloc(10); data[0] = 12; let amt = BigInt(r.amountMinor); for (let i = 1; i <= 8; i++) { data[i] = Number(amt & BigInt(255)); amt >>= BigInt(8); } data[9] = r.decimals;
  const transfer = new TransactionInstruction({ programId: TOKEN, data, keys: [
    { pubkey: from, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false }, { pubkey: toAta, isSigner: false, isWritable: true },
    { pubkey: me, isSigner: true, isWritable: false }, { pubkey: new PublicKey(r.reference), isSigner: false, isWritable: false }] });
  return new Transaction().add(create, transfer);
}

/** Port of billing/TopUpSheet.tsx: $5/$10/$25, Pay with Card (coming soon) or a coin, the USDC summary and Pay button; the coin picker is its own step. */
function TopUpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const k = useC();
  const { token, wallet: addr } = useSession() as ReturnType<typeof useSession> & { wallet?: string };
  const { reload } = useData();
  const [pack, setPack] = useState(10);
  const [rail, setRail] = useState<"card" | "crypto">("crypto");
  const [coin, setCoin] = useState("USDC");
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [usdc, setUsdc] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "signing" | "verifying" | "done">("ready");
  const [err, setErr] = useState("");
  const [other, setOther] = useState(false);
  const [req, setReq] = useState<CryptoReq | null>(null);
  const [deposit, setDeposit] = useState<{ address?: string; tag?: string } | null>(null);
  const [cfg, setCfg] = useState<{ mint?: string; ready?: boolean } | null>(null);
  useEffect(() => {
    if (!open || !token) return;
    api<{ rails?: { crypto?: { mint?: string; ready?: boolean } } }>("/api/billing", {}, token).then((b) => setCfg(b.rails?.crypto ?? null)).catch(() => setCfg(null));
  }, [open, token]);
  useEffect(() => {
    if (!open || !addr || !cfg?.mint) return;
    new Connection(RPC(), "confirmed").getParsedTokenAccountsByOwner(new PublicKey(addr), { mint: new PublicKey(cfg.mint) })
      .then((r) => setUsdc(r.value.reduce((n, a) => n + Number((a.account.data as { parsed: { info: { tokenAmount: { amount: string } } } }).parsed.info.tokenAmount.amount), 0))).catch(() => setUsdc(null));
  }, [open, addr, cfg?.mint]);
  useEffect(() => {
    if (!open || coin === "USDC" || !token) return; setDeposit(null);
    api<{ address?: string; tag?: string }>("/api/topup/deposit", { method: "POST", body: JSON.stringify({ rail: `${coin}:solana` }) }, token).then(setDeposit).catch(() => setDeposit({}));
  }, [open, coin, token]);
  const close = () => { setPicking(false); setPhase("ready"); setErr(""); setOther(false); setReq(null); onClose(); };
  const request = async () => { if (req && req.expiresAt > Date.now() + 60_000) return req; const r = await api<{ crypto: CryptoReq }>("/api/billing/checkout", { method: "POST", body: JSON.stringify({ rail: "crypto", product: "credits", id: String(pack) }) }, token); setReq(r.crypto); return r.crypto; };
  const verify = async (paymentId: string, sig?: string) => {
    setPhase("verifying");
    for (let i = 0; i < 5; i++) {
      try { const r = await api<{ status: string }>("/api/billing/verify", { method: "POST", body: JSON.stringify({ paymentId, ...(sig ? { sig } : {}) }) }, token); if (r.status === "paid") { setPhase("done"); reload().catch(() => {}); setTimeout(close, 900); return; } } catch { /* try again */ }
      await new Promise((x) => setTimeout(x, 1500));
    }
    setPhase("ready"); setErr("We haven't seen that payment yet.");
  };
  const pay = async () => {
    setErr("");
    try { const r = await request(); setPhase("signing"); const sig = await signAndSend(usdcTx(new PublicKey(addr!), r)); await verify(r.id, sig); }
    catch (e) { setPhase("ready"); setErr(e instanceof Error && e.message ? e.message : "The payment didn't go through."); }
  };
  const need = pack * 1e6, shortUsdc = usdc !== null && usdc < need;
  const coinInfo = COINS.find((c) => c.id === coin)!;
  const sol = COINS.find((c) => c.id === "SOL")!;
  const CoinNet = ({ id, size = 32 }: { id: string; size?: number }) => (
    <View style={{ width: size, height: size }}><Image source={COINS.find((c) => c.id === id)!.logo} style={{ width: size, height: size, borderRadius: size / 2 }} />
      <Image source={sol.logo} style={{ position: "absolute", right: -2, bottom: -2, width: size * 0.42, height: size * 0.42, borderRadius: size, borderWidth: 2, borderColor: k.card }} /></View>
  );

  if (picking) {
    const coins = COINS.filter((c) => !q.trim() || `${c.id} ${c.name} solana`.toLowerCase().includes(q.trim().toLowerCase()));
    return (
      <WSheet open={open} title="Pay with crypto" icon="wallet" sub="Pick a coin, then the network you'll send on." onClose={() => setPicking(false)}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityLabel="Back" onPress={() => setPicking(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="back" size={16} color={k.ink75} /></Pressable>
          <View style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: k.tint, borderWidth: 1, borderColor: k.line, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 }}>
            <Icon name="search" size={16} color={k.ink45} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search coins or networks" placeholderTextColor={k.ink45} style={{ flex: 1, color: k.ink, fontFamily: F.sans, fontSize: 14 }} />
          </View>
        </View>
        <Label s={9} c={k.ink45} style={{ marginTop: 14, marginBottom: 4 }}>All coins</Label>
        {coins.map((c, i) => (
          <Pressable key={c.id} onPress={() => { setCoin(c.id); setRail("crypto"); setPicking(false); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: k.line }}>
            <Image source={c.logo} style={{ width: 32, height: 32, borderRadius: 16 }} />
            <View style={{ flex: 1 }}><T f="bold" s={14.5}>{c.id}</T><T s={12} c={k.ink60}>{c.name}</T></View>
            {coin === c.id ? <Icon name="check" size={16} color={k.brandInk} /> : <Icon name="right" size={16} color={k.ink45} />}
          </Pressable>
        ))}
      </WSheet>
    );
  }
  const rowsUsdc: [string, string, string?][] = [["Amount", `${pack} USDC`], ["For", `$${pack} for your Lexari balance`], ["Network", env.cluster === "devnet" ? "Solana devnet" : "Solana"], ["From", addr ? short(addr) : "…"], ["Your USDC", usdc === null ? "Checking…" : (usdc / 1e6).toFixed(2), shortUsdc ? "#e5484d" : undefined]];
  return (
    <WSheet open={open} title="Top up" icon="wallet" sub="Add to your Lexari balance." onClose={close}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[5, 10, 25].map((v) => <Pressable key={v} onPress={() => setPack(v)} style={{ flex: 1, borderRadius: 16, paddingVertical: 10, alignItems: "center", backgroundColor: pack === v ? GRAPE : k.card, borderWidth: 1, borderColor: pack === v ? GRAPE : k.line }}><T f="display" s={21} c={pack === v ? "#fff" : k.ink}>{`$${v}`}</T></Pressable>)}
      </View>
      <Label s={9.5} c={k.ink60} style={{ marginTop: 20, marginBottom: 8 }}>Pay with</Label>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setRail("card")} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, padding: 12, backgroundColor: rail === "card" ? k.ink : k.card, borderWidth: 1, borderColor: rail === "card" ? k.ink : k.line }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: rail === "card" ? "rgba(255,255,255,0.15)" : k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="file" size={18} color={rail === "card" ? k.bg : k.ink} /></View>
          <View style={{ flex: 1 }}><T f="bold" s={14} c={rail === "card" ? k.bg : k.ink}>Card</T><T s={11.5} c={rail === "card" ? k.bg : k.ink60} lines={1}>Coming soon</T></View>
        </Pressable>
        <Pressable onPress={() => (rail === "crypto" ? setPicking(true) : setRail("crypto"))} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, padding: 12, backgroundColor: rail === "crypto" ? k.ink : k.card, borderWidth: 1, borderColor: rail === "crypto" ? k.ink : k.line }}>
          <CoinNet id={coin} />
          <View style={{ flex: 1, minWidth: 0 }}><T f="bold" s={14} c={rail === "crypto" ? k.bg : k.ink}>{coin}</T><T s={11.5} c={rail === "crypto" ? k.bg : k.ink60} lines={2}>{env.cluster === "devnet" ? "Solana devnet" : "Solana"}</T></View>
          <Pressable accessibilityLabel="Change coin" onPress={() => setPicking(true)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: rail === "crypto" ? "rgba(127,127,127,0.18)" : k.tint, alignItems: "center", justifyContent: "center", transform: [{ rotate: "90deg" }] }}><Icon name="right" size={12} color={rail === "crypto" ? k.bg : k.ink} /></Pressable>
        </Pressable>
      </View>
      <View style={{ marginTop: 16 }}>
        {rail === "card" ? (
          <View style={{ borderRadius: 20, backgroundColor: k.tint, padding: 16, alignItems: "center" }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, alignItems: "center", justifyContent: "center" }}><Icon name="file" size={22} color={k.brandInk} /></View>
            <T f="bold" s={15} style={{ marginTop: 12 }}>Card payments are coming soon</T>
            <T s={13} c={k.ink60} style={{ marginTop: 4, textAlign: "center", maxWidth: 300 }}>{"We're finishing card checkout. You can pay with USDC on Solana today."}</T>
            <Pill label={`Pay $${pack} with USDC`} h={40} style={{ marginTop: 16, alignSelf: "stretch" }} onPress={() => { setCoin("USDC"); setRail("crypto"); }} />
          </View>
        ) : coin === "USDC" ? (
          <>
            <View style={{ borderRadius: 16, backgroundColor: k.tint, paddingHorizontal: 16 }}>
              {rowsUsdc.map(([a, b, c], i) => <View key={a} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: k.line }}><T s={13} c={k.ink60}>{a}</T><T f={a === "From" ? "mono" : "bold"} s={a === "From" ? 12 : 13} c={c || (a === "From" ? k.brandInk : k.ink)} lines={1} style={{ flexShrink: 1, paddingLeft: 12 }}>{b}</T></View>)}
            </View>
            {shortUsdc && phase !== "done" ? (
              <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: "rgba(91,43,255,0.10)", borderWidth: 1, borderColor: "rgba(91,43,255,0.30)", padding: 14 }}>
                <T f="bold" s={14}>{`You need ${pack} USDC${usdc ? `, you have ${(usdc / 1e6).toFixed(2)}` : ""}`}</T>
                <T s={12.5} c={k.ink60} style={{ marginTop: 2, lineHeight: 17 }}>Get free devnet USDC at <T s={12.5} f="bold" c={k.brandInk} onPress={() => Linking.openURL("https://faucet.circle.com")}>faucet.circle.com</T> for the address above (choose Solana Devnet), or pay from another wallet.</T>
              </View>
            ) : null}
            {err ? <T s={13} c="#e5484d" style={{ marginTop: 12 }}>{err}</T> : null}
            {phase === "done" ? <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: GRAPE, paddingHorizontal: 16, paddingVertical: 12 }}><Icon name="check" size={18} /><T f="bold" s={14.5} c="#fff">Paid</T></View>
              : <Pill label={phase === "signing" ? "Waiting for signature…" : phase === "verifying" ? "Checking the payment…" : `Pay ${pack} USDC`} h={40} style={{ marginTop: 16 }} disabled={phase !== "ready" || !addr || shortUsdc || usdc === null} onPress={() => void pay()} />}
            {phase !== "done" ? (
              <View style={{ marginTop: 12 }}>
                <Pressable onPress={() => { setOther((v) => !v); if (!req) request().catch(() => setErr("Couldn't start the payment.")); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}><T f="bold" s={12.5} c={k.ink60}>Pay from another wallet</T><View style={{ transform: [{ rotate: other ? "-90deg" : "90deg" }] }}><Icon name="right" size={12} color={k.ink60} /></View></Pressable>
                {other ? (
                  <View style={{ marginTop: 8, borderRadius: 16, backgroundColor: k.tint, padding: 14 }}>
                    {!req ? <T s={12.5} c={k.ink60}>Preparing a payment link…</T> : (
                      <>
                        <T s={12.5} c={k.ink75} style={{ lineHeight: 17 }}>Send exactly <T f="bold" s={12.5}>{`${pack} USDC`}</T> with Phantom, Solflare or Backpack using this Solana Pay link. It carries a reference so we can find it.</T>
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                          <Pill label="Open in wallet" kind="light" h={40} style={{ flex: 1 }} onPress={() => Linking.openURL(req.url)} />
                          <Pill label="Copy link" kind="ghost" icon="copy" h={40} style={{ flex: 1 }} onPress={() => Clipboard.setStringAsync(req.url)} />
                        </View>
                        <Pressable onPress={() => void verify(req.id)} style={{ marginTop: 8, alignItems: "center" }}><T f="bold" s={13} c={k.brandInk}>{"I've paid, check it"}</T></Pressable>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <View style={{ borderRadius: 16, backgroundColor: k.tint, padding: 14, alignItems: "center", gap: 10 }}>
            <Label s={9.5} c={k.ink60}>{`Your ${coinInfo.name} deposit address`}</Label>
            {deposit?.address ? <><View style={{ padding: 12, borderRadius: 18, backgroundColor: "#fff" }}><QRCode value={deposit.address} size={160} /></View>
              <Pressable onPress={() => Clipboard.setStringAsync(deposit.address!)}><T f="mono" s={12} c={k.ink75} style={{ textAlign: "center" }}>{deposit.address}</T></Pressable></>
              : <T s={13} c={k.ink60}>{deposit ? "This coin isn't open for top ups yet." : "Loading…"}</T>}
          </View>
        )}
      </View>
      <T s={11.5} c={k.ink45} style={{ marginTop: 12, textAlign: "center", lineHeight: 16 }}>{"Your balance pays for AI usage, hires, agent cards and funding agents. It can't be withdrawn."}</T>
    </WSheet>
  );
}
