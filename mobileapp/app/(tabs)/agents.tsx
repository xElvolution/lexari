import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, MessageCircle, Monitor, Phone, Plus } from "lucide-react-native";
import { Button, Card, Face, Header, IconButton, Muted, Notice, Screen, SectionLabel, Sheet, Skeleton, T, friendly, tap } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { ROSTER, specialist } from "@/content/roster";
import { grape } from "@/theme/colors";

type Agent = { slug: string; name: string; role?: string; kind?: string; seed?: number };

export default function Agents() {
  const { token } = useSession();
  const { palette } = usePrefs();
  const [rows, setRows] = useState<Agent[] | null>(null);
  const [open, setOpen] = useState<Agent | null>(null);
  const [msg, setMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { const res = await api<{ agents: Agent[] }>("/api/agents", {}, token); setRows(res.agents || []); setMsg(""); }
    catch (e) { setRows([]); setMsg(friendly(e, "Your agents didn't load.")); }
  }, [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const go = (path: string) => { setOpen(null); router.push(path); };
  const home: Agent = { slug: "home", name: "Your agent", role: "Personal assistant" };
  const list = [home, ...(rows || []).filter((a) => a.slug !== "home")];

  return (
    <Screen>
      <Header title="Agents" sub="Your AI team" pill right={<IconButton label="Hire an agent" onPress={() => router.push("/(tabs)/marketplace")}><Plus color={palette.ink} size={18} /></IconButton>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl tintColor={grape} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 8, marginTop: 6 }}>
          {list.map((a) => {
            const s = specialist(a.slug);
            return (
              <Card key={a.slug} onPress={() => setOpen(a)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <Face slug={s ? a.slug : undefined} seed={s ? undefined : a.seed} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.ink, fontSize: 15, fontWeight: "600" }}>{a.name}</Text>
                  <Muted>{a.role || s?.job || a.kind || "Agent"}</Muted>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#34d399" }} />
                  <ChevronRight color={palette.muted} size={18} />
                </View>
              </Card>
            );
          })}
          {rows === null ? <><Skeleton h={70} r={20} /><Skeleton h={70} r={20} /></> : null}
        </View>
        {msg ? <Notice text={msg} onRetry={load} /> : null}

        {rows !== null && rows.length === 0 ? (
          <>
            <SectionLabel>Hire your first specialist</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {ROSTER.slice(0, 6).map((s) => (
                <Pressable key={s.slug} onPress={() => { tap(); router.push(`/marketplace/${s.slug}`); }} style={{ width: 120, padding: 12, borderRadius: 18, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, alignItems: "center", gap: 6 }}>
                  <Face slug={s.slug} size={52} />
                  <Text style={{ color: palette.ink, fontSize: 13, fontWeight: "600" }}>{s.name}</Text>
                  <Muted style={{ textAlign: "center" }}>{s.job}</Muted>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </ScrollView>
      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Face slug={specialist(open.slug) ? open.slug : undefined} size={56} mood="happy" animated />
              <View style={{ flex: 1 }}>
                <Text style={[T.h2, { color: palette.ink }]}>{open.name}</Text>
                <Muted>{open.role || specialist(open.slug)?.job || "Agent"}</Muted>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {[{ l: "Chat", I: MessageCircle, p: `/chat/${open.slug}` }, { l: "Call", I: Phone, p: `/call/${open.slug}` }, { l: "Computer", I: Monitor, p: `/desktop/${open.slug}` }].map(({ l, I, p }) => (
                <Pressable key={l} onPress={() => { tap(); go(p); }} style={({ pressed }) => ({ flex: 1, height: 74, borderRadius: 18, backgroundColor: palette.tint, alignItems: "center", justifyContent: "center", gap: 6, opacity: pressed ? 0.8 : 1 })}>
                  <I color={palette.brand} size={20} />
                  <Text style={{ color: palette.ink, fontSize: 12, fontWeight: "600" }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <Button kind="ghost" label="Close" onPress={() => setOpen(null)} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
