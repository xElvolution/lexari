/** Landing page art (lexari.ai), ported to React Native: the hanging hero ID badge (shared/components/Badge.tsx),
 * the finale face row (landing/components/Finale.tsx), the desk brief screen (Desk.tsx) and a roster card (Roster.tsx). Same faces, colours and words. */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, TextInput, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import AgentFace from "./AgentFace";
import type { ColorKey } from "./avatar";
import { F, GRAPE, Label, T } from "@/web/kit";

export const BADGE = { company: "LEXARI", role: "Home agent", seat: "Seat 01", since: "Started today", inputLabel: "Name your agent", defaultName: "Juniper", hint: "Tap to flip. Drag to swing. Type a name." };

function Barcode({ text, w }: { text: string; w: number }) {
  const bars: number[] = [];
  for (const ch of (text || "lexari").padEnd(10, "x")) { const c = ch.charCodeAt(0); bars.push(1 + (c % 3), 1 + ((c >> 2) % 2)); }
  const total = bars.reduce((a, b) => a + b + 1, 0); let x = 0;
  return <Svg width={w} height={32} viewBox={`0 0 ${total} 20`} preserveAspectRatio="none">{bars.map((b, i) => { const r = <Rect key={i} x={x} y={0} width={i % 2 ? 0.6 : b} height={20} fill="#0a0a0a" />; x += b + 1; return r; })}</Svg>;
}

/** The hero badge on its lanyard. It sways on its own and swings when dragged, like the landing page. */
export function HeroBadge({ name, setName, width = 250, faceSize = 112 }: { name: string; setName?: (v: string) => void; width?: number; faceSize?: number }) {
  const a = useRef(new Animated.Value(7)).current;
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (drag) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: -4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    Animated.spring(a, { toValue: 4, useNativeDriver: true, friction: 3 }).start(() => loop.start());
    return () => loop.stop();
  }, [drag, a]);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
    onPanResponderGrant: () => setDrag(true),
    onPanResponderMove: (_, g) => a.setValue(Math.max(-40, Math.min(40, -g.dx / 6))),
    onPanResponderRelease: () => setDrag(false),
  })).current;
  const rot = a.interpolate({ inputRange: [-40, 40], outputRange: ["-40deg", "40deg"] });
  const shown = name || "Your agent";
  const strap = 84;
  return (
    <Animated.View {...pan.panHandlers} style={{ alignItems: "center", transform: [{ translateY: -(strap + 200) }, { rotate: rot }, { translateY: strap + 200 }] }}>
      <View style={{ width: 30, height: strap, backgroundColor: GRAPE, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, alignItems: "center", justifyContent: "center" }}>
        <Label s={8} c="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: "90deg" }], width: 60, textAlign: "center" }}>lexari</Label>
      </View>
      <View style={{ zIndex: 2, marginTop: -4, width: 48, height: 28, borderRadius: 6, backgroundColor: "#d4d4d4", alignItems: "center", justifyContent: "center" }}><View style={{ width: 24, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.4)" }} /></View>
      <View style={{ marginTop: -8, width, borderRadius: 26, backgroundColor: "#fff", padding: 12, shadowColor: "#140050", shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 30 }, elevation: 12 }}>
        <View style={{ alignSelf: "center", marginBottom: 8, width: 64, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <View style={{ borderRadius: 18, backgroundColor: GRAPE, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}>
          <T f="display" s={26} c="#fff" style={{ lineHeight: 28 }}>HELLO</T>
          <Label s={9.5} c="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>my name is</Label>
        </View>
        <View style={{ marginTop: 12, height: 118, borderRadius: 18, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <AgentFace size={faceSize} animated />
          <Label s={9} c="rgba(255,255,255,0.7)" style={{ position: "absolute", left: 12, top: 12 }}>{BADGE.company}</Label>
          <View style={{ position: "absolute", right: 12, top: 10, borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={9} c="#fff">● online</Label></View>
        </View>
        <View style={{ paddingHorizontal: 6, paddingTop: 12 }}>
          <T f="display" s={40} c="#0a0a0a" lines={1} style={{ lineHeight: 42, letterSpacing: -1.6 }}>{shown}</T>
          <Label s={9.5} c="rgba(0,0,0,0.6)" style={{ marginTop: 8 }}>{`${BADGE.role} · ${BADGE.seat} · ${BADGE.since}`}</Label>
          <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(91,43,255,0.4)", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Label s={8.5} c={GRAPE}>{BADGE.inputLabel}</Label>
            <TextInput value={name} editable={!!setName} maxLength={12} onChangeText={(v) => setName?.(v.replace(/[^\p{L}\p{N} ._-]/gu, ""))} accessibilityLabel={BADGE.inputLabel} style={{ color: "#0a0a0a", fontSize: 16, fontFamily: F.bold, padding: 0 }} />
          </View>
          <View style={{ marginTop: 12 }}><Barcode text={name} w={width - 36} /></View>
        </View>
      </View>
    </Animated.View>
  );
}

/** The five tilted faces from the landing finale. */
export const FINALE: [ColorKey, number][] = [["orange", 101], ["yellow", 7], ["teal", 45], ["pink", 23], ["sky", 88]];
export function FaceRow({ size = 84 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {FINALE.map(([color, seed], i) => <View key={seed} style={{ marginLeft: i ? -8 : 0, transform: [{ rotate: `${(i - 2) * 7}deg` }] }}><AgentFace seed={seed} variant={{ color }} size={size} animated={i === 2} /></View>)}
    </View>
  );
}

/** Desk: the "brief" screen of the landing desk (a job arrives, the agent answers). */
export function DeskBrief({ width }: { width: number }) {
  return (
    <View style={{ width, borderRadius: 24, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
      <View style={{ flexDirection: "row", gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <View key={c} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} />)}</View>
      <View style={{ padding: 16 }}>
        <View style={{ alignSelf: "flex-end", maxWidth: "80%", borderRadius: 16, borderBottomRightRadius: 6, backgroundColor: GRAPE, padding: 12 }}><T f="semi" s={13} c="#fff">Compare three budgeting tools. Keep it to one page.</T></View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <AgentFace size={40} animated state="speaking" />
          <View style={{ maxWidth: "75%", borderRadius: 16, borderBottomLeftRadius: 6, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}><T s={13} c="#fff">On it. Opening my browser now.</T></View>
        </View>
        <Label s={9} c="rgba(255,255,255,0.4)" style={{ marginTop: 16 }}>job received · 09:00</Label>
      </View>
    </View>
  );
}

const ROSTER_COLORS: ColorKey[] = ["orange", "blue", "green", "yellow", "red", "teal", "pink", "sky"];
export const ROSTER_CARDS = [
  { name: "Scout", quip: "I read so you do not have to.", job: "Web research", rating: 4.9, jobs: 1840 },
  { name: "Quill", quip: "Give me a rough idea. I will give it back sharp.", job: "Writing and edits", rating: 4.8, jobs: 1322 },
  { name: "Tally", quip: "Messy sheet? Send it over.", job: "Numbers and sheets", rating: 4.8, jobs: 976 },
];
/** A roster card from the landing marketplace section (front side). */
export function RosterCard({ i, width = 250, onPress }: { i: number; width?: number; onPress?: () => void }) {
  const a = ROSTER_CARDS[i];
  return (
    <Pressable onPress={onPress} style={{ width, borderRadius: 28, backgroundColor: "#13101f", overflow: "hidden", shadowColor: "#3514b0", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 10 }, borderBottomWidth: 10, borderBottomColor: "#3514b0" }}>
      <View style={{ height: 160, backgroundColor: "#1c1533", alignItems: "center", justifyContent: "center" }}>
        <AgentFace seed={i * 11 + 5} variant={{ color: ROSTER_COLORS[i] }} size={128} animated={i === 0} />
        <T f="display" s={24} c="rgba(255,255,255,0.3)" style={{ position: "absolute", left: 16, top: 10 }}>{`#${String(i + 1).padStart(2, "0")}`}</T>
        <View style={{ position: "absolute", right: 16, top: 14, borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 4 }}><Label s={9} c="#0a0a0a">{`★ ${a.rating}`}</Label></View>
      </View>
      <View style={{ padding: 18 }}>
        <T f="display" s={38} c="#fff" style={{ letterSpacing: -1.5, lineHeight: 40 }}>{a.name}</T>
        <T f="semi" s={15} c="#a58bff" style={{ marginTop: 2 }}>{a.job}</T>
        <View style={{ marginTop: 12, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#0b0915", paddingHorizontal: 14, paddingVertical: 10 }}><T f="semi" s={14} c="#fff">{`“${a.quip}”`}</T></View>
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 2, borderStyle: "dashed", borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 12 }}>
          <T s={13} c="rgba(255,255,255,0.65)"><T f="bold" s={13} c="#fff">{a.jobs.toLocaleString("en-US")}</T> jobs done</T>
          <View style={{ borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 10, paddingVertical: 6 }}><Label s={9} c="#fff">flip ↻</Label></View>
        </View>
      </View>
    </Pressable>
  );
}
