import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { BadgeCheck, CalendarDays, Code2, Fingerprint, MessageCircle, Phone, ShieldCheck, TrendingUp } from "lucide-react-native";
import { Button, Face, tap } from "@/components/ui";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { COINS } from "@/content/roster";
import { grape } from "@/theme/colors";

const PAGES = [
  { title: "Meet your\npersonalized AI agent", body: "An agent that is only yours, with a name, a face and an ID card. It shows up every day and gets to know how you like things done." },
  { title: "Its own computer,\na memory that lasts", body: "It works on a real computer with a browser, a terminal and files, and it remembers what matters. It never forgets you when the app closes." },
  { title: "Hire more\nas you grow", body: "Bring in specialists from the marketplace when the job gets bigger than one desk. You approve every payment from your wallet." },
];

function Chip({ icon, label, style }: { icon: React.ReactNode; label: string; style: object }) {
  return (
    <View style={[{ position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#13101f", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, style]}>
      {icon}
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function Art({ i, w }: { i: number; w: number }) {
  const h = Math.min(330, w * 0.86);
  const box = { width: w - 40, height: h, alignSelf: "center" as const };
  if (i === 0) return (
    <View style={box}>
      <View style={{ position: "absolute", left: "50%", top: h * 0.12, marginLeft: -70 }}><Face size={140} animated mood="idle" /></View>
      <View style={{ position: "absolute", left: 6, top: h * 0.06 }}><Face slug="scout" size={64} /></View>
      <View style={{ position: "absolute", right: 10, top: h * 0.02 }}><Face slug="quill" size={58} /></View>
      <View style={{ position: "absolute", left: 22, top: h * 0.56 }}><Face slug="tally" size={56} /></View>
      <View style={{ position: "absolute", right: 16, top: h * 0.52 }}><Face slug="frame" size={66} /></View>
      <View style={{ position: "absolute", bottom: 4, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: "#13101f", borderWidth: 1, borderColor: "rgba(143,107,255,0.45)" }}>
        <BadgeCheck color="#a58bff" size={18} />
        <View>
          <Text style={{ color: "#fff", fontSize: 12.5, fontWeight: "700" }}>Nova · Agent ID</Text>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 10.5, fontFamily: "monospace" }}>BbnD…M6Po · Solana</Text>
        </View>
      </View>
    </View>
  );
  if (i === 1) return (
    <View style={box}>
      <View style={{ position: "absolute", left: "50%", top: h * 0.2, marginLeft: -80 }}><Face size={160} mood="speaking" animated /></View>
    </View>
  );
  return (
    <View style={[box, { justifyContent: "center" }]}>
      <View style={{ borderRadius: 26, padding: 18, backgroundColor: grape, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", letterSpacing: 0.6 }}>BALANCE</Text>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700", letterSpacing: -1, marginTop: 2 }}>$1,240.50</Text>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {COINS.slice(0, 4).map((c, k) => <Image key={c.id} source={c.logo} style={{ width: 24, height: 24, borderRadius: 12, marginLeft: k ? -6 : 0, borderWidth: 2, borderColor: grape }} />)}
        </View>
      </View>
      <View style={{ marginTop: 12, borderRadius: 20, padding: 14, backgroundColor: "#13101f", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Face slug="scout" size={30} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 12.5, fontWeight: "600" }}>Scout · daily budget</Text>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", marginTop: 6 }}><View style={{ width: "38%", height: 6, borderRadius: 3, backgroundColor: "#8f6bff" }} /></View>
          </View>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>$3.80 / $10</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(52,211,153,0.15)", alignItems: "center", justifyContent: "center" }}><ShieldCheck color="#34d399" size={16} /></View>
          <Text style={{ color: "#fff", fontSize: 12.5, flex: 1 }}>Every payment needs your OK</Text>
          <Fingerprint color="#a58bff" size={20} />
        </View>
      </View>
    </View>
  );
}

function Dot({ on }: { on: boolean }) {
  const st = useAnimatedStyle(() => ({ width: withSpring(on ? 22 : 7, { damping: 15 }), opacity: withSpring(on ? 1 : 0.35) }));
  return <Animated.View style={[{ height: 7, borderRadius: 4, backgroundColor: on ? "#8f6bff" : "#fff" }, st]} />;
}

export default function Welcome() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = usePrefs();
  const { token } = useSession();
  const [page, setPage] = useState(0);
  const [h, setH] = useState(0);
  const ref = useRef<ScrollView>(null);

  const done = () => { setOnboarded(); router.replace(token ? "/(tabs)/agents" : "/(auth)/sign-in"); };
  const next = () => { if (page >= 2) return done(); ref.current?.scrollTo({ x: width * (page + 1), animated: true }); setPage(page + 1); };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) { setPage(p); tap(); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={{ height: 48, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 16 }}>
        {page < 2 ? <Pressable onPress={() => { tap(); done(); }} hitSlop={12}><Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "600" }}>Skip</Text></Pressable> : null}
      </View>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
        {PAGES.map((p, i) => (
          <View key={i} style={{ width, height: h || undefined, paddingHorizontal: 24, justifyContent: "center", paddingBottom: 12 }}>
            <Art i={i} w={width - 48} />
            <Text style={{ color: "#fff", fontSize: 30, fontWeight: "700", letterSpacing: -1, lineHeight: 34, marginTop: 30 }}>{p.title}</Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 14.5, lineHeight: 21, marginTop: 10 }}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, gap: 22 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>{PAGES.map((_, i) => <Dot key={i} on={i === page} />)}</View>
        <Button label={page >= 2 ? "Get started" : "Next"} onPress={next} />
      </View>
    </View>
  );
}
