import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CalendarDays, CheckCircle2, Code2, Flame, Gift, ListTodo, MessageCircle, Phone, Sparkles, Trophy, TrendingUp, type LucideIcon } from "lucide-react-native";
import { Button, Card, Face, FadeIn, Header, Muted, Notice, SectionLabel, Sheet, Skeleton, T, friendly, tap } from "@/components/ui";
import { NotifyBell } from "@/components/Notifications";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { biometricGate } from "@/components/Gates";
import { grape } from "@/theme/colors";

type Quest = { id: string; goal: number; progress: number; reward: number; claimed: boolean; period?: string };
type Hub = {
  player?: { coins: number; streak: number; checkedInToday: boolean; lifetime?: number } | null;
  quests?: Quest[];
  levels?: { slug: string; name: string; level: number; xp: number }[];
};

type Tile = { key: string; label: string; Icon: LucideIcon; tint: string; title: string; body: string; cta: string; go: string };
const TILES: Tile[] = [
  { key: "chat", label: "Chat", Icon: MessageCircle, tint: "#a58bff", title: "Chat with your agent", body: "Ask for research, drafts, plans or a quick answer. It remembers what matters to you.", cta: "Open chat", go: "/chat/home" },
  { key: "call", label: "Call", Icon: Phone, tint: "#34d399", title: "Talk out loud", body: "Start a voice call. Your agent listens, answers and takes notes while you talk.", cta: "Start a call", go: "/call/home" },
  { key: "meet", label: "Meetings", Icon: CalendarDays, tint: "#7dd3fc", title: "Send it to your meetings", body: "Your agent joins, writes the notes and sends you the action items.", cta: "See tasks and meetings", go: "/tasks" },
  { key: "build", label: "Build", Icon: Code2, tint: "#fcd34d", title: "Build something", body: "Describe a site, a script or a sheet. Your agent builds it on its own computer.", cta: "Ask to build", go: "/chat/home?prompt=build" },
  { key: "trade", label: "Trade", Icon: TrendingUp, tint: "#f9a8d4", title: "Watch the market", body: "Set alerts and let an agent watch the chain. Every trade still needs your approval.", cta: "Ask about a token", go: "/chat/home?prompt=trade" },
  { key: "tasks", label: "Tasks", Icon: ListTodo, tint: "#ff8a3d", title: "Tasks", body: "Everything your agents are working on, in one list.", cta: "Open tasks", go: "/tasks" },
];

const QUEST_NAMES: Record<string, string> = { chat: "Send 3 messages", hire: "Hire a specialist", checkin: "Check in", call: "Take a call", task: "Finish a task" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Stat({ Icon, color, value, label, loading }: { Icon: LucideIcon; color: string; value: string; label: string; loading: boolean }) {
  const { palette } = usePrefs();
  return (
    <View style={{ flex: 1, backgroundColor: palette.card, borderRadius: 16, padding: 12, borderWidth: 0.5, borderColor: palette.line }}>
      <Icon color={color} size={16} />
      {loading ? <Skeleton w={40} h={16} style={{ marginTop: 8 }} /> : <Text style={{ color: palette.ink, fontSize: 17, fontWeight: "700", marginTop: 6 }}>{value}</Text>}
      <Muted>{label}</Muted>
    </View>
  );
}

export default function HubTab() {
  const { token } = useSession();
  const { palette } = usePrefs();
  const [hub, setHub] = useState<Hub | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tile, setTile] = useState<Tile | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try { setHub(await api<Hub>("/api/hub/state", {}, token)); setMsg(""); }
    catch (e) { setHub({}); setMsg(friendly(e, "The Hub didn't load.")); }
  }, [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const checkIn = async () => {
    if (!token || hub?.player?.checkedInToday) return;
    if (!(await biometricGate("Sign today's check-in"))) return;
    setBusy(true);
    try {
      await api("/api/hub/act", { method: "POST", body: JSON.stringify({ kind: "checkin" }) }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load();
    } catch (e) { setMsg(friendly(e, "Check-in didn't go through. Try again.")); }
    finally { setBusy(false); }
  };

  const claim = async (id: string) => {
    if (!token || !(await biometricGate("Claim this quest"))) return;
    try {
      await api("/api/hub/act", { method: "POST", body: JSON.stringify({ kind: "quest", id }) }, token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load();
    } catch (e) { setMsg(friendly(e, "That quest wasn't claimed.")); }
  };

  const loading = hub === null;
  const p = hub?.player;
  const level = hub?.levels?.[0];
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl tintColor={grape} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <HeaderPad>
          <Header title={greeting()} sub="Here's your team today" pill right={<NotifyBell />} />
        </HeaderPad>
        <View style={{ paddingHorizontal: 16 }}>
          <FadeIn>
            <Pressable onPress={() => { tap(); router.push("/chat/home"); }} style={({ pressed }) => ({ borderRadius: 24, padding: 16, backgroundColor: grape, overflow: "hidden", transform: [{ scale: pressed ? 0.985 : 1 }] })}>
              <View style={{ position: "absolute", right: -50, top: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,0.1)" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Face size={64} mood="happy" animated />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 }}>Your agent is ready</Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5, marginTop: 2 }}>{level ? `${level.name} · level ${level.level}` : "Ask for anything, big or small"}</Text>
                </View>
              </View>
              <View style={{ marginTop: 14, height: 42, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.25)", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
                <Sparkles color="#c9b8ff" size={15} />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13.5 }}>Ask your agent…</Text>
              </View>
            </Pressable>
          </FadeIn>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {TILES.map((t) => (
              <Pressable key={t.key} onPress={() => { tap(); setTile(t); }} style={({ pressed }) => ({ width: "31.4%", aspectRatio: 1.05, borderRadius: 18, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, alignItems: "center", justifyContent: "center", gap: 8, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: `${t.tint}22`, alignItems: "center", justifyContent: "center" }}><t.Icon color={t.tint} size={19} /></View>
                <Text style={{ color: palette.ink, fontSize: 12, fontWeight: "600" }}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <SectionLabel>Today</SectionLabel>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat Icon={Trophy} color="#fcd34d" value={p ? String(p.coins) : "—"} label="Coins" loading={loading} />
            <Stat Icon={Flame} color="#ff8a3d" value={p ? `${p.streak}d` : "—"} label="Streak" loading={loading} />
            <Stat Icon={Sparkles} color="#a58bff" value={level ? `Lv ${level.level}` : "—"} label="Level" loading={loading} />
          </View>

          <Card style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(52,211,153,0.15)", alignItems: "center", justifyContent: "center" }}>
              {p?.checkedInToday ? <CheckCircle2 color="#34d399" size={20} /> : <Gift color="#34d399" size={20} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.body, { color: palette.ink, fontWeight: "600" }]}>{p?.checkedInToday ? "Checked in today" : "Daily check-in"}</Text>
              <Muted>{p?.checkedInToday ? "Come back tomorrow to keep the streak." : "Sign once a day to grow your streak."}</Muted>
            </View>
            {!p?.checkedInToday ? <Button label={busy ? "…" : "Claim"} onPress={checkIn} disabled={busy || !p} style={{ height: 36, paddingHorizontal: 16, borderRadius: 12 }} /> : null}
          </Card>

          {(hub?.quests || []).length ? <SectionLabel>Quests</SectionLabel> : null}
          {(hub?.quests || []).map((q) => {
            const ready = q.progress >= q.goal && !q.claimed;
            const pct = Math.min(1, q.progress / Math.max(1, q.goal));
            return (
              <Card key={q.id} onPress={ready ? () => claim(q.id) : undefined} style={{ marginBottom: 8, paddingVertical: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={[T.body, { color: palette.ink, fontWeight: "600" }]}>{QUEST_NAMES[q.id] || q.id}</Text>
                  <Text style={{ color: ready ? "#34d399" : palette.muted, fontSize: 12, fontWeight: "600" }}>{q.claimed ? "Claimed" : ready ? "Claim" : `+${q.reward}`}</Text>
                </View>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: palette.tint, marginTop: 8 }}><View style={{ width: `${pct * 100}%`, height: 5, borderRadius: 3, backgroundColor: palette.brand }} /></View>
              </Card>
            );
          })}
          {msg ? <Notice text={msg} onRetry={load} /> : null}
        </View>
      </ScrollView>
      <Sheet open={!!tile} onClose={() => setTile(null)} title={tile?.title}>
        {tile ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: `${tile.tint}22`, alignItems: "center", justifyContent: "center" }}><tile.Icon color={tile.tint} size={22} /></View>
              <Text style={[T.body, { color: palette.muted, flex: 1 }]}>{tile.body}</Text>
            </View>
            <Button label={tile.cta} onPress={() => { const go = tile.go; setTile(null); router.push(go); }} />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function HeaderPad({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 16 }}>{children}</View>;
}
