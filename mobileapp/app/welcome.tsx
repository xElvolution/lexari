import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Button, tap } from "@/components/ui";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { BADGE, DeskBrief, HeroBadge, RosterCard } from "@/components/Landing";

const PAGES = [
  { title: "Meet your\npersonalized AI agent", body: "An agent that is only yours, with a name, a face and an ID card. It shows up every day and gets to know how you like things done." },
  { title: "Its own computer,\na memory that lasts", body: "It works on a real computer with a browser, a terminal and files, and it remembers what matters. It never forgets you when the app closes." },
  { title: "Hire more\nas you grow", body: "Bring in specialists from the marketplace when the job gets bigger than one desk. You approve every payment from your wallet." },
];

function Art({ i, w }: { i: number; w: number }) {
  const [name, setName] = useState(BADGE.defaultName);
  if (i === 0) return <View style={{ alignItems: "center", height: 400, marginTop: -40 }}><View style={{ transform: [{ scale: 0.8 }], marginTop: -50 }}><HeroBadge name={name} setName={setName} width={250} /></View></View>;
  if (i === 1) return <View style={{ alignItems: "center" }}><DeskBrief width={w} /></View>;
  return (
    <View style={{ height: 380, alignItems: "center" }}>
      <View style={{ position: "absolute", left: w / 2 - 20, top: 26, opacity: 0.55, transform: [{ rotate: "6deg" }] }}><RosterCard i={1} width={210} /></View>
      <View style={{ position: "absolute", left: w / 2 - 190, top: 0, transform: [{ rotate: "-4deg" }] }}><RosterCard i={0} width={230} /></View>
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
