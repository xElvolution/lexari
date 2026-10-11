/** The phone agent panel: the same ID card the website shows when you open an agent. */
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlipIdCard } from "@/components/Landing";
import Icon from "@/components/Icon";
import { specialist } from "@/content/roster";
import { AgentTile, GRAPE, Label, T, useC } from "@/web/kit";
import { useSession } from "@/state/session";
import { useData, youName } from "@/web/data";

function idNo(id: string) {
  let h = 2166136261;
  for (const ch of `id-${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h >>>= 0;
  return `LX-${String(h % 10000).padStart(4, "0")}-${String((h >>> 14) % 1000).padStart(3, "0")}`;
}
const born = (ms?: number) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Today");

export default function AgentPage() {
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const k = useC();
  const insets = useSafeAreaInsets();
  const { token } = useSession();
  const { me } = useData();
  const agent = me?.agents.find((a) => a.slug === slug);
  const sp = specialist(slug);
  const desk = Math.max(1, (me?.agents.findIndex((a) => a.slug === slug) ?? 0) + 1);
  const kind = slug === "home" || agent?.kind === "home" ? "Personal" : agent?.kind === "custom" ? "Custom" : "Hired";
  const name = agent?.name || sp?.name || "Agent";
  const role = agent?.role || (kind === "Personal" ? "Personal agent" : sp?.job || "Agent");
  const maker = kind === "Hired" ? "Maker" : youName(me);
  const memory = (agent?.meta as { memory?: boolean } | undefined)?.memory !== false;
  const about = kind === "Personal"
    ? `${name} is yours: it has its own computer, remembers what you tell it and can hire help.`
    : kind === "Custom" ? agent?.about || "No instructions yet."
    : sp?.back || "";
  const chips = kind === "Hired" ? (sp?.skills ?? []).slice(0, 4).map(([n]) => n) : kind === "Personal" ? ["Own computer", "Lasting memory", "Can hire help"] : agent?.skills ?? [];
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/agents"));
  const ready = !!agent;

  return (
    <View style={{ flex: 1, backgroundColor: k.alt, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: k.line }}>
        {ready ? <AgentTile slug={slug} look={agent?.look} size={36} radius={12} dot={false} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T f="bold" s={16} lines={1}>{ready ? name : "Agent"}</T>
          {ready ? <T s={12.5} c={k.ink60} lines={1}>{kind === "Personal" ? "Your personal agent" : kind === "Custom" ? "Made by you" : `Hired · by ${maker}`}</T> : null}
        </View>
        {ready ? <Pressable onPress={() => router.push(`/chat/${slug}`)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: GRAPE, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="chat" size={15} color="#fff" /><T f="bold" s={13.5} c="#fff">Chat</T>
        </Pressable> : null}
        <Pressable accessibilityLabel="Close" onPress={close} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
          <Icon name="x" size={19} color={k.ink75} />
        </Pressable>
      </View>
      {!token ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <T f="bold" s={18}>Sign in to see this card</T>
          <Pressable onPress={() => router.replace("/(auth)/sign-in")} style={{ marginTop: 14 }}><T f="bold" s={15} c={GRAPE}>Sign in</T></Pressable>
        </View>
      ) : !me ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><T s={14} c={k.ink60}>Loading the card…</T></View>
      ) : !agent ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <T f="bold" s={18}>This agent isn't on your team</T>
          <T s={14} c={k.ink60} style={{ marginTop: 8, textAlign: "center" }}>Hire them from the marketplace, or open an agent you already have.</T>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
          <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 8 }}>
            <FlipIdCard
              name={name}
              slug={slug}
              width={268}
              faceSize={96}
              role={role}
              seat={`Desk ${String(desk).padStart(2, "0")}`}
              since={`Born ${born(agent.createdAt)}`}
              idNo={idNo(slug)}
              kind={kind}
              facts={[["Role", role], ["Desk", String(desk).padStart(2, "0")], ["Born", born(agent.createdAt)], [kind === "Hired" ? "Maker" : "Owner", maker], ["Memory", memory ? "On" : "Off"], ["ID", idNo(slug)]]}
            />
            <T s={12} c={k.ink45} style={{ marginTop: 10 }}>Tap the card to flip it</T>
          </View>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <View style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 16 }}>
              <Label s={9} c={k.ink45}>What it does</Label>
              <T s={14.5} style={{ marginTop: 6, lineHeight: 21 }}>{about}</T>
            </View>
            {chips.length ? (
              <View style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 16 }}>
                <Label s={9} c={k.ink45}>{kind === "Hired" ? "Skills" : "Can do"}</Label>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {chips.map((c) => <View key={c} style={{ borderRadius: 999, backgroundColor: k.tint, paddingHorizontal: 12, paddingVertical: 6 }}><T f="semi" s={13}>{c}</T></View>)}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
