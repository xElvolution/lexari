/** Port of webapp/components/wallet/WalletsView.tsx at phone width: Wallet / Cards tabs, Lexari balance (Top up, History), each agent's wallet (Fund, Move to balance). */
import { useState } from "react";
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
  const [sheet, setSheet] = useState<"topup" | "history" | null>(null);
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
        <T f="display" s={23} style={{ marginTop: 10, letterSpacing: -1.1 }}>Wallet.</T>
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

function HistorySheet({ open, onClose, wallet, onTopUp }: { open: boolean; onClose: () => void; wallet: Wallet | null; onTopUp: () => void }) {
  const k = useC();
  const rows = wallet?.history ?? [];
  const added = rows.filter((r) => r.delta > 0).reduce((a, r) => a + r.delta, 0); const spent = rows.filter((r) => r.delta < 0).reduce((a, r) => a - r.delta, 0);
  return (
    <WSheet open={open} title="History" onClose={onClose}>
      <T s={13} c={k.ink60}>{rows.length ? `${rows.length} item${rows.length === 1 ? "" : "s"} on your Lexari balance` : "Everything your balance does shows here."}</T>
      {rows.length ? (
        <>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: k.tint, padding: 12 }}><Label s={9} c={k.ink45}>Added</Label><T f="bold" s={17} c="#1fbf6a" style={{ marginTop: 4 }}>{`+${usd(added)}`}</T></View>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: k.tint, padding: 12 }}><Label s={9} c={k.ink45}>Spent</Label><T f="bold" s={17} style={{ marginTop: 4 }}>{`−${usd(spent)}`}</T></View>
          </View>
          {rows.map((r) => { const up = r.delta > 0; return (
            <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: k.line }}>
              <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: up ? "#e7f8ee" : k.tint }}><Icon name={up ? "plus" : r.kind === "fund" ? "wallet" : "spark"} size={17} color={up ? "#137a3d" : k.ink75} /></View>
              <View style={{ flex: 1 }}><T f="semi" s={14} lines={1}>{r.label}</T><T s={12} c={k.ink45}>{r.kind === "usage" ? `${day(r.at)} · AI usage that day` : `${day(r.at)}, ${new Date(r.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}</T></View>
              <T f="bold" s={14.5} c={up ? "#1fbf6a" : k.ink}>{`${up ? "+" : "−"}${usd(Math.abs(r.delta))}`}</T>
            </View>
          ); })}
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <T f="bold" s={16}>Nothing here yet</T>
          <T s={13} c={k.ink60} style={{ textAlign: "center", marginTop: 4 }}>Top ups, plans, hires, agent funding and refunds will show up here as they happen.</T>
          <Pill label="Top up" icon="plus" h={42} style={{ marginTop: 14 }} onPress={onTopUp} />
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

const NETWORKS: Record<string, string[]> = { USDC: ["Solana"], USDT: ["Solana"], SOL: ["Solana"], SKR: ["Solana"], BONK: ["Solana"], JUP: ["Solana"] };
function TopUpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const k = useC();
  const { token } = useSession();
  const [step, setStep] = useState<"coin" | "network" | "pay">("coin");
  const [coin, setCoin] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [info, setInfo] = useState<{ address?: string; tag?: string } | null>(null);
  const [err, setErr] = useState("");
  const close = () => { setStep("coin"); setCoin(null); setInfo(null); setErr(""); onClose(); };
  const pick = async (c: string) => {
    if (!token) return; setStep("pay"); setErr(""); setInfo(null);
    try { setInfo(await api(`/api/topup/deposit`, { method: "POST", body: JSON.stringify({ rail: `${c}:solana` }) }, token)); }
    catch (e) { setErr(e instanceof Error ? e.message : "This rail is not open."); }
  };
  const coins = COINS.filter((c) => !q.trim() || `${c.id} ${c.name} solana`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <WSheet open={open} title={step === "coin" ? "Pay with crypto" : "Top up"} onClose={close}>
      {step === "coin" ? (
        <>
          <T s={13} c={k.ink60}>{"Pick a coin, then the network you'll send on."}</T>
          <View style={{ marginTop: 12, height: 44, borderRadius: 22, backgroundColor: k.tint, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 }}>
            <Icon name="search" size={16} color={k.ink45} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search coins or networks" placeholderTextColor={k.ink45} style={{ flex: 1, color: k.ink, fontFamily: F.sans, fontSize: 14.5 }} />
          </View>
          <Label s={9} c={k.ink45} style={{ marginTop: 14 }}>All coins</Label>
          {coins.map((c) => (
            <Pressable key={c.id} onPress={() => { setCoin(c.id); setStep("network"); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: k.line }}>
              <Image source={c.logo} style={{ width: 34, height: 34, borderRadius: 17 }} />
              <View style={{ flex: 1 }}><T f="bold" s={15}>{c.id}</T><T s={12.5} c={k.ink60}>{c.name}</T></View>
              <Icon name="right" size={16} color={k.ink45} />
            </Pressable>
          ))}
        </>
      ) : step === "network" && coin ? (
        <>
          <Pressable onPress={() => setStep("coin")} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="back" size={16} color={k.ink} /><T f="bold" s={13.5}>Change coin</T></Pressable>
          <T s={13} c={k.ink60} style={{ marginTop: 10 }}>{"Choose the network you'll send on"}</T>
          {(NETWORKS[coin] ?? ["Solana"]).map((n) => (
            <Pressable key={n} onPress={() => pick(coin)} style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: k.tint, padding: 12 }}>
              <Image source={COINS.find((c) => c.id === "SOL")!.logo} style={{ width: 30, height: 30, borderRadius: 15 }} />
              <View style={{ flex: 1 }}><T f="bold" s={15}>{n}</T><T s={12.5} c={k.ink60}>Solana devnet</T></View>
              <Icon name="right" size={16} color={k.ink45} />
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Pressable onPress={() => setStep("coin")} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="back" size={16} color={k.ink} /><T f="bold" s={13.5}>Change coin</T></Pressable>
          <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: k.tint, padding: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T s={13} c={k.ink60}>Network</T><T f="bold" s={13}>Solana devnet</T></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T s={13} c={k.ink60}>You pay</T><T f="bold" s={13}>{coin ?? ""}</T></View>
          </View>
          {info?.address ? (
            <View style={{ marginTop: 14, alignItems: "center", gap: 10 }}>
              <T f="bold" s={14}>Pay from another wallet</T>
              <View style={{ padding: 12, borderRadius: 18, backgroundColor: "#fff" }}><QRCode value={info.address} size={168} /></View>
              <Pressable onPress={() => Clipboard.setStringAsync(info.address!)}><T s={12} c={k.ink75} style={{ fontFamily: F.mono, textAlign: "center" }}>{info.address}</T></Pressable>
              {info.tag ? <T s={12} c={k.ink60}>{`Tag ${info.tag}`}</T> : null}
            </View>
          ) : !err ? <T s={13} c={k.ink60} style={{ marginTop: 14 }}>Pricing…</T> : null}
          {err ? <T s={13} c="#ff5a7a" style={{ marginTop: 12 }}>{err}</T> : null}
          <T s={12} c={k.ink45} style={{ marginTop: 14, lineHeight: 17 }}>{"Your balance pays for AI usage, hires, agent cards and funding agents. It can't be withdrawn."}</T>
        </>
      )}
    </WSheet>
  );
}
