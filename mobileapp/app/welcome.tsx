/**
 * First run: lexari.ai's landing page, top to bottom, with the same words and art (landing/app/page.tsx):
 * Hero with the hanging badge, 01 Its desk (the first shift), 02 Memory, 03 The roster, 04 Seats and the Finale.
 * Sections rise in as they scroll into view, like landing/components/Reveal.tsx.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { tap } from "@/components/ui";
import Badge, { badgeCopy } from "@/components/Badge";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { COPY, DeskShift, Display, FaceRow, FloorPlan, LandingBg, LandingLogo, MemoryNotes, RosterFan, SectionLabel } from "@/components/Landing";
import { Btn, F, GRAPE, Rise } from "@/web/kit";

const PROOF = [{ k: "1", v: "agent that is only yours" }, { k: "24/7", v: "its computer keeps running" }, { k: "100", v: "seats on the biggest team" }];
const FINALE = { title: "Your personalized agent is waiting for a name.", body: "Name it, give it a job and watch it clock in." };

/** Rises in once its top comes into view. */
function Reveal({ seen, children, delay = 0 }: { seen: boolean; children: ReactNode; delay?: number }) {
  const p = useSharedValue(0);
  useEffect(() => { if (seen) p.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })); }, [seen, p, delay]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 40 }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = usePrefs();
  const { token } = useSession();
  const [name, setName] = useState(badgeCopy.defaultName);
  const [tops, setTops] = useState<Record<string, number>>({});
  const [y, setY] = useState(0);
  const ref = useRef<ScrollView>(null);
  const W = width - 40;
  const hero = Math.min(54.4, Math.max(45.6, width * 0.128));
  const title = width <= 370 ? 31 : 34.5;
  const done = () => { setOnboarded(); router.replace(token ? "/(tabs)/agents" : { pathname: "/(auth)/sign-in", params: { name: name.trim() || badgeCopy.defaultName } }); };
  const at = (k: string) => (e: { nativeEvent: { layout: { y: number } } }) => { const v = e.nativeEvent.layout.y; setTops((t) => (t[k] === v ? t : { ...t, [k]: v })); };
  const seen = (k: string) => tops[k] !== undefined && y + height > tops[k] + 80;
  const body = { fontFamily: F.sans, fontSize: 16, lineHeight: 26, color: "rgba(255,255,255,0.75)" };

  const section = (k: string, S: { label: string; title: string; body?: string }, art: ReactNode, grape = false) => (
    <View key={k} onLayout={at(k)} style={{ paddingHorizontal: 20, paddingVertical: 56, backgroundColor: grape ? GRAPE : "transparent", overflow: "hidden" }}>
      <Reveal seen={seen(k)}><SectionLabel>{S.label}</SectionLabel></Reveal>
      <Reveal seen={seen(k)} delay={80}><Display s={title} style={{ marginTop: 16 }}>{S.title}</Display></Reveal>
      {S.body ? <Reveal seen={seen(k)} delay={160}><Text style={[body, { marginTop: 16 }, grape ? { color: "rgba(255,255,255,0.9)" } : null]}>{S.body}</Text></Reveal> : null}
      <Reveal seen={seen(k)} delay={240}><View style={{ marginTop: 32, alignItems: "center" }}>{art}</View></Reveal>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView ref={ref} onScroll={(e) => setY(e.nativeEvent.contentOffset.y)} scrollEventThrottle={48} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {/* hero */}
        <View style={{ overflow: "hidden", paddingTop: insets.top }}>
          <LandingBg width={width} height={1400} />
          <View style={{ height: 60, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <LandingLogo scale={0.85} />
            <Pressable onPress={() => { tap(); done(); }} hitSlop={10} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", justifyContent: "center" }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>{token ? "Open the app" : "Sign in"}</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Rise delay={60}><Display s={hero} style={{ lineHeight: hero * 0.98 }}>{COPY.hero.title[0]}</Display></Rise>
            <Rise delay={130}><Display s={hero} c="#a58bff" style={{ lineHeight: hero * 0.98 }}>{COPY.hero.title[1]}</Display></Rise>
            <Rise delay={200}><Display s={22} c="rgba(255,255,255,0.85)" style={{ marginTop: 14 }}>{`${COPY.hero.subtitle} ↗`}</Display></Rise>
          </View>
          <Rise delay={260} style={{ marginTop: 8, alignItems: "center" }}>
            <Badge name={name} setName={setName} strap={64} />
            <Text style={{ marginTop: 20, fontFamily: F.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{badgeCopy.hint}</Text>
          </Rise>
          <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
            <Rise delay={340}><Text style={body}>{COPY.hero.body}</Text></Rise>
            <Rise delay={420} style={{ marginTop: 24, gap: 12 }}>
              <Btn full kind="brand" h={50} fs={15} drop={4} label={`Hire ${name.trim() || "your agent"} →`} onPress={done} />
              <Pressable onPress={() => { tap(); ref.current?.scrollTo({ y: (tops.desk ?? 900) - 10, animated: true }); }} style={{ height: 50, borderRadius: 999, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: "#fff" }}>See it at work</Text>
              </Pressable>
            </Rise>
            <Rise delay={500} style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", flexDirection: "row", gap: 16, paddingBottom: 24 }}>
              {PROOF.map((p) => (
                <View key={p.k} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 24, letterSpacing: -1, color: "#fff" }}>{p.k}</Text>
                  <Text style={{ marginTop: 4, fontFamily: F.sans, fontSize: 12, lineHeight: 16, color: "rgba(255,255,255,0.6)" }}>{p.v}</Text>
                </View>
              ))}
            </Rise>
          </View>
        </View>

        {section("desk", COPY.desk, <DeskShift width={W} />)}
        {section("memory", COPY.memory, <MemoryNotes width={W} />)}
        {section("roster", COPY.roster, <RosterFan width={W} />, true)}
        {section("seats", COPY.seats, <FloorPlan width={W} />)}

        {/* finale */}
        <View onLayout={at("finale")} style={{ backgroundColor: GRAPE, paddingHorizontal: 20, paddingVertical: 56, alignItems: "center", overflow: "hidden" }}>
          <Reveal seen={seen("finale")}><FaceRow size={Math.min(64, (W - 40) / 5)} /></Reveal>
          <Reveal seen={seen("finale")} delay={100}><Display s={title} style={{ marginTop: 24, textAlign: "center" }}>{FINALE.title}</Display></Reveal>
          <Reveal seen={seen("finale")} delay={180}><Text style={[body, { marginTop: 14, textAlign: "center", color: "rgba(255,255,255,0.9)" }]}>{FINALE.body}</Text></Reveal>
          <Reveal seen={seen("finale")} delay={260}><Btn kind="white" h={50} fs={15} drop={4} label="Hire your agent →" onPress={done} style={{ marginTop: 24, alignSelf: "center" }} /></Reveal>
          <Text style={{ marginTop: 36, fontFamily: F.display, fontSize: 92, letterSpacing: -4, color: "rgba(255,255,255,0.12)" }}>lexari</Text>
        </View>
      </ScrollView>
    </View>
  );
}
