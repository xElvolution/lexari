import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Card, Face, Header, Muted, Screen, tap } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { ROSTER } from "@/content/roster";

type Hire = { slug: string };

export default function Marketplace() {
  const { token } = useSession();
  const { palette } = usePrefs();
  const [hired, setHired] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await api<Hire[]>("/api/hires", {}, token);
      setHired(new Set((Array.isArray(rows) ? rows : []).map((r) => r.slug)));
    } catch { setHired(new Set()); }
  }, [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  return (
    <Screen>
      <Header title="Market" sub="Specialists you can hire by the task" pill />
      <ScrollView contentContainerStyle={{ paddingBottom: 28, flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 6 }}>
        {ROSTER.map((s) => {
          const tag = s.free ? "Free" : hired.has(s.slug) ? "Hired" : "Hire";
          return (
            <Card key={s.slug} onPress={() => router.push(`/marketplace/${s.slug}`)} style={{ width: "48.4%", alignItems: "center", paddingVertical: 16, gap: 4 }}>
              <Face slug={s.slug} size={62} />
              <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "700", marginTop: 6 }}>{s.name}</Text>
              <Muted>{s.job}</Muted>
              <Pressable onPress={() => { tap(); router.push(`/marketplace/${s.slug}`); }} style={{ marginTop: 8, paddingHorizontal: 14, height: 28, borderRadius: 14, justifyContent: "center", backgroundColor: tag === "Hire" ? "rgba(91,43,255,0.22)" : palette.tint }}>
                <Text style={{ color: tag === "Hire" ? palette.brand : palette.muted, fontSize: 12, fontWeight: "700" }}>{tag}</Text>
              </Pressable>
            </Card>
          );
        })}
        <View style={{ width: "100%" }}><Muted style={{ textAlign: "center", marginTop: 8 }}>Pay in SKR, USDC or SOL. You approve every transfer on this phone.</Muted></View>
      </ScrollView>
    </Screen>
  );
}
