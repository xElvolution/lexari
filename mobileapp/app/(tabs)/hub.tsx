/** Port of webapp/components/hub/HubPhone.tsx: balance, check-in, Mystery box / Level up, quests, Invite and Achievements rows with their sheets, Store. */
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { AgentTile, Card, Coin, F, GRAPE, Label, Pill, Segs, T, WSheet, useC } from "@/web/kit";
import { primaryOf, useData, type HubState } from "@/web/data";
import { ACHIEVEMENTS, MAX_LEVEL, PERKS, QUESTS, STORE_CATEGORIES, STORE_ITEMS, STREAK_PAY, countdown, nextReset, xpFor, type Period } from "@/web/hubData";

type SheetId = "train" | "invite" | "badges" | "store" | null;

export default function Hub() {
  const k = useC();
  const { token } = useSession();
  const { me, hub, reload } = useData();
  const { hideBalances, toggleBalances } = usePrefs();
  const [sheet, setSheet] = useState<SheetId>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const act = async (body: Record<string, unknown>, label: string, ok: (r: { coins?: number }) => string) => {
    if (!token) return; setBusy(label);
    try { const r = await api<{ ok?: boolean; error?: string; coins?: number }>("/api/hub/act", { method: "POST", body: JSON.stringify(body) }, token); setToast(r.ok === false ? r.error || "Not ready yet." : ok(r)); await reload(); }
    catch (e) { setToast(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(""); setTimeout(() => setToast(""), 2600); }
  };

  const p = hub?.player;
  const coins = p?.coins ?? 0;
  const mask = "••••";
  const week = weekEarned(hub, now);
  const team = me?.agents.length ?? 0;
  const primary = primaryOf(me);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12, paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} tintColor={k.ink} />}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View><Label s={9.5}>Hub</Label><T f="xbold" s={22} style={{ marginTop: 4, letterSpacing: -0.4 }}>Earn and level up</T></View>
          <Pill kind="ghost" label="Store" icon="box" h={36} fs={13} onPress={() => setSheet("store")} />
        </View>

        <View style={{ backgroundColor: GRAPE, borderRadius: 20, padding: 16, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -48, top: -64, width: 176, height: 176, borderRadius: 88, borderWidth: 22, borderColor: "rgba(255,255,255,0.07)" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Label s={9} c="rgba(255,255,255,0.7)">Your balance</Label>
            <Pressable accessibilityLabel={hideBalances ? "Show balance" : "Hide balance"} onPress={toggleBalances} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}><Icon name={hideBalances ? "eyeoff" : "eye"} size={13} color="#fff" /></Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
            <Coin size={30} />
            <T f="xbold" s={28} c="#fff">{hub ? (hideBalances ? mask : coins.toLocaleString("en-US")) : "…"}</T>
            <T s={12} c="rgba(255,255,255,0.75)" style={{ marginLeft: "auto", textAlign: "right", lineHeight: 15 }}>{`+${hideBalances ? mask : week} this week\n${hideBalances ? mask : (p?.lifetime ?? 0).toLocaleString("en-US")} all time`}</T>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><T f="semi" s={12} c="#fff">{`🔥 ${p?.streak ?? 0}-day streak`}</T></View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><T f="semi" s={12} c="#fff">{`${team} on your team`}</T></View>
          </View>
        </View>

        {hub && hub.program && !hub.program.live ? <View style={{ backgroundColor: k.tint, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: k.line }}><T f="semi" s={13} c={k.ink75}>Rewards open soon: the Lexari program is not live on Solana yet. Your progress still counts.</T></View> : null}

        <CheckIn hub={hub} now={now} busy={busy} onCheck={(pay) => act({ action: "checkin" }, "checkin", (r) => `Checked in · +${r.coins ?? pay} coins`)} />

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: "#0a0a0a", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <Text style={{ fontSize: 24, opacity: hub?.box && (hub.box as { opened?: boolean }).opened ? 0.7 : 1 }}>🎁</Text>
            <T f="bold" s={15} c="#fff" style={{ marginTop: 8 }}>Mystery box</T>
            <T s={12} c="rgba(255,255,255,0.6)" style={{ lineHeight: 16 }}>{boxOpened(hub) ? `Opened today${boxWon(hub) ? ` · won ${boxWon(hub)}` : ""}` : "15 to 250 coins, once a day"}</T>
            <View style={{ marginTop: "auto", paddingTop: 12 }}>
              {boxOpened(hub) ? <Pill kind="soft" h={32} fs={13} label={`Next in ${countdown(nextReset("daily", now) - now).replace(/ \d+s$/, "")}`} />
                : <Pill kind="light" h={32} fs={13} label={busy === "box" ? "Opening…" : "Open"} style={{ backgroundColor: "#fff" }} onPress={() => act({ action: "box" }, "box", (r) => `Mystery box · +${r.coins ?? 0} coins`)} />}
            </View>
          </View>
          <Card style={{ flex: 1, padding: 14 }} onPress={() => setSheet("train")}>
            <AgentTile slug={primary} look={me?.agents.find((a) => a.slug === primary)?.look} size={30} ring="primary" />
            <T f="bold" s={15} style={{ marginTop: 8 }}>Level up</T>
            <T s={12.5} c={k.ink60} style={{ lineHeight: 16 }}>Spend coins to level up your agent.</T>
            <View style={{ marginTop: 12, height: 32, borderRadius: 16, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><T f="bold" s={13} c={k.brandInk}>Train agents</T></View>
          </Card>
        </View>

        <Quests hub={hub} now={now} busy={busy} onGo={(go) => { if (go === "#level") setSheet("train"); else if (go === "#invite") setSheet("invite"); else if (go === "#store") setSheet("store"); else if (go.startsWith("/")) router.navigate(go === "/agents" ? "/(tabs)/agents" : go === "/brain" ? "/(tabs)/brain" : "/(tabs)/marketplace"); }}
          onClaim={(id, title) => act({ action: "quest", questId: id }, `quest:${id}`, (r) => `${title} · +${r.coins ?? 0} coins`)} />

        <Card style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }} onPress={() => setSheet("invite")}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="users" size={18} color={k.brandInk} /></View>
          <View style={{ flex: 1 }}>
            <T f="bold" s={15}>{`Invite friends · ${friends(hub)} joined`}</T>
            <T s={12.5} c={k.ink60}>{nextTier(hub) ? `${nextTier(hub)!.friends - friends(hub)} more for +${nextTier(hub)!.reward} coins` : "Every milestone reached"}</T>
          </View>
          <Icon name="right" size={16} color={k.ink45} />
        </Card>
        <Card style={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }} onPress={() => setSheet("badges")}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="star" size={18} color={k.brandInk} /></View>
          <View style={{ flex: 1 }}>
            <T f="bold" s={15}>{`Achievements · ${badges(hub, me?.agents.length ?? 0).filter((b) => b.got).length} of ${ACHIEVEMENTS.length}`}</T>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: k.tint, marginTop: 6, overflow: "hidden" }}><View style={{ height: 6, borderRadius: 3, backgroundColor: GRAPE, width: `${(badges(hub, 0).filter((b) => b.got).length / ACHIEVEMENTS.length) * 100}%` }} /></View>
          </View>
          <Icon name="right" size={16} color={k.ink45} />
        </Card>
      </ScrollView>

      {toast ? <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 16, backgroundColor: k.ink, borderRadius: 16, padding: 12 }}><T f="semi" s={13.5} c={k.bg}>{toast}</T></View> : null}

      <TrainSheet open={sheet === "train"} onClose={() => setSheet(null)} hub={hub} coins={coins} busy={busy} onTrain={(agent, n) => act({ action: "train", agent, coins: n }, "train", () => `+${n} XP`)} />
      <InviteSheet open={sheet === "invite"} onClose={() => setSheet(null)} hub={hub} code={me?.user.referralCode || ""} busy={busy} onClaim={(i) => act({ action: "tier", tier: i }, `tier:${i}`, (r) => `Milestone · +${r.coins ?? 0} coins`)} />
      <WSheet open={sheet === "badges"} title="Achievements" onClose={() => setSheet(null)}>
        {(() => { const list = badges(hub, me?.agents.length ?? 0); const n = list.filter((b) => b.got).length; return (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T s={13} c={k.ink60}>Badges you collect as you go.</T><T f="bold" s={13} c={k.brandInk}>{`${n} of ${list.length}`}</T></View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: k.tint, marginTop: 8, overflow: "hidden" }}><View style={{ height: 8, backgroundColor: GRAPE, width: `${(n / list.length) * 100}%` }} /></View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {list.map((a) => (
                <View key={a.id} style={{ width: "48.6%", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, backgroundColor: k.tint, opacity: a.got ? 1 : 0.6 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: a.got ? GRAPE : "transparent", borderWidth: a.got ? 0 : 1.5, borderStyle: "dashed", borderColor: k.ink45 }}><Icon name={a.icon} size={16} color={a.got ? "#fff" : k.ink45} /></View>
                  <View style={{ flex: 1 }}><T f="bold" s={13.5} c={a.got ? k.ink : k.ink60}>{a.title}</T><T s={12} c={k.ink60}>{a.body}</T></View>
                </View>
              ))}
            </View>
          </>
        ); })()}
      </WSheet>
      <StoreSheet open={sheet === "store"} onClose={() => setSheet(null)} hub={hub} coins={coins} onBuy={(id, name) => act({ action: "buy", item: id }, `buy:${id}`, () => `${name} is yours. It's on in your chats.`)} onWear={(kind, id) => act({ action: "wear", kind, item: id }, `wear:${kind}`, () => (id ? "Applied" : "Taken off"))} />
    </View>
  );
}

const boxOpened = (h: HubState | null) => !!(h?.box as { opened?: boolean } | undefined)?.opened;
const boxWon = (h: HubState | null) => (h?.box as { coins?: number | null } | undefined)?.coins ?? 0;
type Tier = { tier: number; friends: number; reward: number; claimed: boolean };
const tiers = (h: HubState | null): Tier[] => ((h as { referral?: { tiers?: Tier[] } } | null)?.referral?.tiers) ?? [];
const friends = (h: HubState | null) => (h as { referral?: { friends?: number } } | null)?.referral?.friends ?? 0;
const nextTier = (h: HubState | null) => tiers(h).find((t) => friends(h) < t.friends);
function weekEarned(h: HubState | null, now: number) {
  const d = new Date(now); const day = (d.getDay() + 6) % 7; const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  return ((h as { ledger?: { amount: number; at: number }[] } | null)?.ledger ?? []).filter((e) => e.at >= start).reduce((a, e) => a + e.amount, 0);
}
function badges(h: HubState | null, team: number) {
  const p = h?.player; const lv = Math.max(1, ...(h?.levels ?? []).map((l) => l.level)); const claimed = (h as { claimedTotal?: number } | null)?.claimedTotal ?? 0;
  const test: Record<string, boolean> = { "first-in": !!p, "streak-3": (p?.streak ?? 0) >= 3, "streak-7": (p?.streak ?? 0) >= 7, "lvl-2": lv >= 2, "lvl-5": lv >= 5, friend: friends(h) > 0, rich: (p?.lifetime ?? 0) >= 1000, quests: claimed >= 10 };
  void team;
  return ACHIEVEMENTS.map((a) => ({ ...a, got: !!test[a.id] }));
}

function CheckIn({ hub, now, busy, onCheck }: { hub: HubState | null; now: number; busy: string; onCheck: (pay: number) => void }) {
  const k = useC();
  const done = !!hub?.player?.checkedInToday; const streak = hub?.player?.streak ?? 0;
  const cur = done ? Math.max(1, streak) : streak + 1; const pay = STREAK_PAY[Math.min(STREAK_PAY.length, cur) - 1];
  const start = Math.max(1, cur - 6);
  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 20 }}>🔥</Text></View>
        <View style={{ flex: 1 }}><T f="bold" s={15}>Daily check-in</T><T s={12.5} c={k.ink60}>{done ? `Done · next in ${countdown(nextReset("daily", now) - now)}` : `Day ${cur} pays ${pay} coins`}</T></View>
        {done ? <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: k.tint, flexDirection: "row", alignItems: "center", gap: 4 }}><Icon name="check" size={14} stroke={3} color={k.ink75} /><T f="bold" s={13} c={k.ink75}>Done</T></View>
          : <Pill h={32} fs={13} label={busy === "checkin" ? "…" : `Check in +${pay}`} onPress={() => onCheck(pay)} disabled={!!busy} />}
      </View>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 12 }}>
        {Array.from({ length: 7 }, (_, i) => start + i).map((d) => {
          const got = d < cur || (d === cur && done);
          return (
            <View key={d} style={{ flex: 1, borderRadius: 9, paddingVertical: 4, alignItems: "center", backgroundColor: got ? GRAPE : k.tint, borderWidth: !got && d === cur ? 1 : 0, borderColor: GRAPE }}>
              <T f="bold" s={9.5} c={got ? "#fff" : d === cur ? k.ink : k.ink45}>{`D${d}`}</T>
              <T f="xbold" s={11.5} c={got ? "#fff" : d === cur ? k.ink : k.ink45}>{String(STREAK_PAY[Math.min(STREAK_PAY.length, d) - 1])}</T>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function Quests({ hub, now, busy, onGo, onClaim }: { hub: HubState | null; now: number; busy: string; onGo: (go: string) => void; onClaim: (id: string, title: string) => void }) {
  const k = useC();
  const [tab, setTab] = useState<Period>("daily");
  const live = hub?.quests ?? [];
  const all = QUESTS.map((q) => { const l = live.find((x) => x.id === q.id); const have = Math.min(q.goal, l?.progress ?? 0); return { ...q, have, claimed: !!l?.claimed, done: have >= q.goal }; });
  const ready = (p: Period) => all.filter((q) => q.period === p && q.done && !q.claimed).length;
  const list = all.filter((q) => q.period === tab);
  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T f="bold" s={17}>Quests</T>
        {tab !== "hard" ? <T s={12} c={k.ink45}>{`Resets in ${countdown(nextReset(tab, now) - now)}`}</T> : null}
      </View>
      <Segs style={{ marginTop: 10 }} on={tab} set={setTab} items={[{ k: "daily", label: "Daily", badge: ready("daily") }, { k: "weekly", label: "Weekly", badge: ready("weekly") }, { k: "hard", label: "Hard", badge: ready("hard") }]} />
      <View style={{ marginTop: 4 }}>
        {list.map((q, i) => (
          <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: k.line }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: q.claimed ? GRAPE : k.tint }}><Icon name={q.claimed ? "check" : q.icon} size={15} color={q.claimed ? "#fff" : k.brandInk} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T f="semi" s={14.5}>{q.title}</T><Coin size={12} /><T f="bold" s={12} c={k.brandInk}>{String(q.reward)}</T></View>
              <T s={12.5} c={k.ink60}>{q.hint}</T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k.tint, overflow: "hidden" }}><View style={{ height: 4, backgroundColor: GRAPE, width: `${Math.round((q.have / q.goal) * 100)}%` }} /></View>
                <T s={11} c={k.ink45}>{`${q.have}/${q.goal}`}</T>
              </View>
            </View>
            {q.claimed ? <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: k.tint, justifyContent: "center" }}><T f="bold" s={13} c={k.ink45}>Done</T></View>
              : q.done ? <Pill h={32} fs={13} label={busy === `quest:${q.id}` ? "…" : "Claim"} onPress={() => onClaim(q.id, q.title)} />
              : <Pill kind="ghost" h={32} fs={13} label="Go" onPress={() => onGo(q.go)} />}
          </View>
        ))}
      </View>
    </Card>
  );
}

function TrainSheet({ open, onClose, hub, coins, busy, onTrain }: { open: boolean; onClose: () => void; hub: HubState | null; coins: number; busy: string; onTrain: (agent: string, n: number) => void }) {
  const k = useC();
  const { me } = useData();
  const made = (me?.agents ?? []).filter((a) => a.kind === "home" || a.kind === "custom");
  const [pick, setPick] = useState("home");
  const a = made.find((x) => x.slug === pick) ?? made[0];
  const lv = hub?.levels?.find((l) => l.slug === a?.slug) ?? { level: 1, xp: 0 };
  const max = lv.level >= MAX_LEVEL; const need = max ? 0 : xpFor(lv.level); const toNext = Math.max(0, need - lv.xp);
  const nextPerk = PERKS.find((p) => p.level > lv.level);
  return (
    <WSheet open={open} title="Train your agents" onClose={onClose}>
      {!a ? <T s={14} c={k.ink60} style={{ textAlign: "center", paddingVertical: 24 }}>Make an agent to start training.</T> : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <T s={13} c={k.ink60} style={{ flex: 1 }}>Coins become XP. Every level unlocks a perk.</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: k.tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Coin size={13} /><T f="bold" s={12.5}>{coins.toLocaleString("en-US")}</T></View>
          </View>
          {made.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6, paddingVertical: 6 }}>
            {made.map((x) => <Pressable key={x.slug} onPress={() => setPick(x.slug)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, backgroundColor: x.slug === a.slug ? GRAPE : k.tint }}><AgentTile slug={x.slug} look={x.look} size={26} dot={false} /><T f="bold" s={13} c={x.slug === a.slug ? "#fff" : k.ink75}>{x.name}</T></Pressable>)}
          </ScrollView> : null}
          <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: "#3514b0", padding: 14, alignItems: "center", overflow: "hidden" }}>
            <View style={{ position: "absolute", top: -60, width: 300, height: 300, borderRadius: 150, backgroundColor: "#6a3dff", opacity: 0.6 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ffd84d", alignItems: "center", justifyContent: "center" }}><Icon name="send" size={15} stroke={3} color="#3514b0" /></View>
              <Text style={{ fontFamily: F.display, fontSize: 30, color: "#fff", letterSpacing: -1.2 }}>{`Level ${lv.level}`}</Text>
            </View>
            <View style={{ marginTop: 12, width: 124, height: 124, borderRadius: 62, backgroundColor: "#0a0a0a", borderWidth: 4, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}>
              <AgentTile slug={a.slug} look={a.look} size={104} dot={false} />
            </View>
            <T f="bold" s={16} c="#fff" style={{ marginTop: 8 }}>{a.name}</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, alignSelf: "stretch" }}>
              <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}><View style={{ height: 10, borderRadius: 5, backgroundColor: "#ffd84d", width: `${max ? 100 : Math.round((lv.xp / need) * 100)}%` }} /></View>
              <T f="semi" s={11.5} c="rgba(255,255,255,0.75)">{max ? "max" : `${lv.xp}/${need} XP`}</T>
            </View>
            <T f="semi" s={12.5} c="rgba(255,255,255,0.65)" style={{ marginTop: 6 }}>{max ? "Max level. A legend." : `${toNext} XP to level ${lv.level + 1}`}</T>
            {!max ? <View style={{ flexDirection: "row", gap: 6, marginTop: 12, alignSelf: "stretch" }}>
              {[25, 100].map((n) => <Pressable key={n} disabled={!!busy || coins <= 0} onPress={() => onTrain(a.slug, n)} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}><T f="bold" s={14} c="#fff">{`+${n} XP`}</T><T f="semi" s={11} c="rgba(255,255,255,0.6)">{String(n)}</T></Pressable>)}
              <Pressable disabled={!!busy || coins < toNext} onPress={() => onTrain(a.slug, toNext)} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: "#ffd84d", alignItems: "center", justifyContent: "center", opacity: coins < toNext ? 0.45 : 1 }}><T f="xbold" s={14} c="#2a0f8f">Level up</T><T f="semi" s={11} c="#2a0f8f">{String(toNext)}</T></Pressable>
            </View> : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}><T f="bold" s={15}>Perks</T>{nextPerk ? <T f="semi" s={12} c={k.ink45}>{`Next: ${nextPerk.title} at Lv ${nextPerk.level}`}</T> : null}</View>
          <View style={{ marginTop: 8, gap: 4 }}>
            {PERKS.map((p) => { const got = lv.level >= p.level; const next = p === nextPerk; return (
              <View key={p.level} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 6, borderRadius: 14, backgroundColor: next ? k.tint : "transparent" }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: got ? GRAPE : k.card, borderWidth: got ? 0 : 1, borderColor: next ? GRAPE : k.line }}>{got ? <Icon name="check" size={14} stroke={3} color="#fff" /> : <T f="xbold" s={12} c={k.ink45}>{String(p.level)}</T>}</View>
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: got ? "rgba(91,43,255,0.15)" : k.tint }}><Icon name={p.icon} size={17} color={got ? k.brandInk : k.ink45} /></View>
                <View style={{ flex: 1 }}><T f="bold" s={14} c={got || next ? k.ink : k.ink60}>{p.title}</T><T s={12.5} c={k.ink60}>{p.body}</T></View>
                <Label s={8.5} c={got ? k.brandInk : k.ink45}>{got ? "Unlocked" : `Lv ${p.level}`}</Label>
              </View>
            ); })}
          </View>
        </>
      )}
    </WSheet>
  );
}

function InviteSheet({ open, onClose, hub, code, busy, onClaim }: { open: boolean; onClose: () => void; hub: HubState | null; code: string; busy: string; onClaim: (i: number) => void }) {
  const k = useC();
  const link = `https://app.lexari.ai/signin?ref=${code}`;
  const msg = `I've got my own AI agent on Lexari. Join with my code ${code} and we both get coins.`;
  const n = friends(hub); const next = nextTier(hub);
  const [copied, setCopied] = useState(false);
  return (
    <WSheet open={open} title="Invite friends" onClose={onClose}>
      <View style={{ borderRadius: 22, backgroundColor: "#0a0a0a", padding: 18, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <View style={{ position: "absolute", left: -60, top: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(91,43,255,0.35)" }} />
        <Label s={9} c="#c9b8ff">Invite friends</Label>
        <Text style={{ fontFamily: F.display, fontSize: 30, color: "#fff", letterSpacing: -1.3, marginTop: 4 }}>Fill your orbit.</Text>
        <T s={13} c="rgba(255,255,255,0.7)" style={{ textAlign: "center", marginTop: 8, lineHeight: 18 }}>{`Friends who join with your code start with 50 coins. You collect a bonus at each milestone. ${n} joined${next ? ` · ${next.friends - n} more for +${next.reward}` : ""}.`}</T>
      </View>
      <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: k.tint, padding: 8, paddingLeft: 14 }}>
        <View style={{ flex: 1 }}>
          <Label s={8.5} c={k.ink45}>Your code</Label>
          <Text style={{ fontFamily: F.monoB, fontSize: 18, color: k.brandInk, letterSpacing: 1.5 }}>{code || "—"}</Text>
          <T s={11} c={k.ink45} style={{ fontFamily: F.mono }}>{link.replace(/^https?:\/\//, "")}</T>
        </View>
        <Pressable accessibilityLabel="Copy invite link" onPress={async () => { await Clipboard.setStringAsync(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: copied ? GRAPE : k.card, borderWidth: 1, borderColor: k.line }}><Icon name={copied ? "check" : "copy"} size={16} color={copied ? "#fff" : k.ink75} /></Pressable>
      </View>
      <Pill label="Share invite" icon="arrow" h={48} style={{ marginTop: 10 }} onPress={() => Share.share({ message: `${msg} ${link}` }).catch(() => {})} />
      <T f="bold" s={15} style={{ marginTop: 16 }}>Milestones</T>
      <View style={{ marginTop: 8, gap: 4 }}>
        {tiers(hub).map((t, i) => { const reached = n >= t.friends; return (
          <View key={t.friends} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: k.tint, borderWidth: reached && !t.claimed ? 1 : 0, borderColor: GRAPE }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: reached ? GRAPE : k.card }}><Icon name={t.claimed ? "check" : "box"} size={15} color={reached ? "#fff" : k.ink45} /></View>
            <View style={{ flex: 1 }}><T f="bold" s={14}>{TIER_TITLES[i] ?? `Milestone ${i + 1}`}</T><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><T s={12.5} c={k.ink60}>{`${t.friends} ${t.friends === 1 ? "friend" : "friends"} · `}</T><Coin size={11} /><T s={12.5} c={k.ink60}>{t.reward.toLocaleString("en-US")}</T></View></View>
            {reached && !t.claimed ? <Pill h={32} fs={13} label={busy === `tier:${i}` ? "…" : "Claim"} onPress={() => onClaim(i)} /> : <T f="semi" s={12} c={t.claimed ? k.brandInk : k.ink45}>{t.claimed ? "Collected" : `${t.friends - n} to go`}</T>}
          </View>
        ); })}
      </View>
    </WSheet>
  );
}
const TIER_TITLES = ["First friend", "Small crew", "Full desk", "Founding circle"];

const SWATCH: Record<string, string[]> = {
  "bg-aurora": ["#2a1470", "#0f3a3a"], "bg-grid": ["#14112a", "#2a2350"], "bg-sunset": ["#5a2430", "#3514b0"], "bg-stars": ["#0b0920", "#3514b0"], "bg-lavender": ["#3b3260", "#2a2350"],
  "bg-dots": ["#1d1731", "#3a2a80"], "bg-pinstripe": ["#1d1731", "#2b2450"], "bg-ripple": ["#1a1640", "#3b2a90"], "bg-deepsea": ["#06213a", "#0b3d5c"], "bg-velvet": ["#3a0b30", "#5b2bff"],
  "bubble-glass": ["rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"], "bubble-neon": ["#00e5ff", "#5b2bff"], "bubble-candy": ["#ff6b9a", "#ffb86b"], "bubble-outline": ["transparent", "transparent"], "bubble-midnight": ["#0a0a2a", "#1d1731"],
  "bubble-lilac": ["#c9b8ff", "#8f6bff"], "bubble-mint": ["#7ef0c4", "#1fbf6a"], "bubble-sunset": ["#ff7a59", "#ff4d94"], "bubble-gold": ["#ffd84d", "#b8960f"],
};
function StoreSheet({ open, onClose, hub, coins, onBuy, onWear }: { open: boolean; onClose: () => void; hub: HubState | null; coins: number; onBuy: (id: string, name: string) => void; onWear: (kind: string, id: string | null) => void }) {
  const k = useC();
  const cos = ((hub as { cosmetics?: { owned?: string[]; bg?: string; bubble?: string } } | null)?.cosmetics) ?? {};
  const owned = new Set(cos.owned ?? []);
  const [full, setFull] = useState<"bg" | "bubble" | null>(null);
  const cat = full ? STORE_CATEGORIES.find((c) => c.kind === full) : null;
  const card = (it: (typeof STORE_ITEMS)[number], small: boolean) => {
    const have = owned.has(it.id); const on = (cos as Record<string, unknown>)[it.kind] === it.id; const sw = SWATCH[it.id] ?? [k.tint, k.card];
    return (
      <View key={it.id} style={{ width: small ? 80 : "48.5%", borderRadius: small ? 16 : 18, padding: small ? 6 : 8, backgroundColor: k.tint, borderWidth: on ? 2 : 1, borderColor: on ? GRAPE : k.line }}>
        <View style={{ height: small ? 58 : 96, borderRadius: 12, backgroundColor: sw[1], overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", left: -10, top: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: sw[0], opacity: 0.9 }} />
          {it.kind === "bubble" ? <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: sw[0], borderWidth: it.id === "bubble-outline" ? 1.5 : 0, borderColor: GRAPE }}><T f="bold" s={10} c="#fff">Hi!</T></View> : null}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}><T f="bold" s={small ? 12 : 13.5} lines={1}>{it.name}</T></View>
        {!have ? <Pressable disabled={coins < it.price} onPress={() => onBuy(it.id, it.name)} style={{ marginTop: 6, height: small ? 32 : 36, borderRadius: 18, backgroundColor: coins < it.price ? (k.dark ? "rgba(255,255,255,0.15)" : "rgba(10,10,10,0.15)") : GRAPE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><Coin size={11} /><T f="bold" s={12} c={coins < it.price ? k.ink45 : "#fff"}>{String(it.price)}</T></Pressable>
          : on ? <Pressable onPress={() => onWear(it.kind, null)} style={{ marginTop: 6, height: small ? 32 : 36, borderRadius: 18, backgroundColor: k.card, borderWidth: 1, borderColor: GRAPE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}><Icon name="check" size={13} stroke={3} color={k.brandInk} /><T f="bold" s={12} c={k.brandInk}>{small ? "On" : "Applied"}</T></Pressable>
          : <Pressable onPress={() => onWear(it.kind, it.id)} style={{ marginTop: 6, height: small ? 32 : 36, borderRadius: 18, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, alignItems: "center", justifyContent: "center" }}><T f="bold" s={12}>Apply</T></Pressable>}
      </View>
    );
  };
  return (
    <WSheet open={open} title={cat ? cat.title : "Store"} onClose={() => { setFull(null); onClose(); }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: k.tint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Coin size={13} /><T f="bold" s={12.5}>{coins.toLocaleString("en-US")}</T></View>
      {cat ? (
        <View>
          <Pressable onPress={() => setFull(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}><Icon name="back" size={16} color={k.ink} /><T f="bold" s={13}>Back</T></Pressable>
          <T s={12.5} c={k.ink45} style={{ marginTop: 6 }}>{cat.sub}</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{STORE_ITEMS.filter((x) => x.kind === cat.kind).map((it) => card(it, false))}</View>
        </View>
      ) : STORE_CATEGORIES.map((c) => (
        <View key={c.kind} style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ borderRadius: 999, backgroundColor: "rgba(91,43,255,0.15)", borderWidth: 1, borderColor: "rgba(91,43,255,0.3)", paddingHorizontal: 12, paddingVertical: 4 }}><T f="xbold" s={13.5} c={k.brandInk}>{c.title}</T></View>
            <Pressable onPress={() => setFull(c.kind)} style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 2 }}><T f="bold" s={13} c={k.brandInk}>See more</T><Icon name="arrow" size={14} color={k.brandInk} /></Pressable>
          </View>
          <T s={12} c={k.ink45} style={{ marginTop: 4 }}>{c.sub}</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>{STORE_ITEMS.filter((x) => x.kind === c.kind).map((it) => card(it, true))}</ScrollView>
        </View>
      ))}
    </WSheet>
  );
}
