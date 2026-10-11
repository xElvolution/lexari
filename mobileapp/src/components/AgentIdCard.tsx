/**
 * Port of webapp/components/agent/AgentIdCard.tsx: an agent's ID badge on a short metal clip, in the landing style.
 * It sways gently; tap (or the screen reader action) turns it over with the web's springy cubic-bezier(.3,1.35,.5,1).
 */
import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import AgentFace from "./AgentFace";
import BgArt from "./BgArt";
import { Barcode, CardLogo, Clip, Code, Disp, Lbl } from "./Badge";
import { Face } from "./ui";
import { lookVariant, type FaceLook } from "./avatar";
import { F, GRAPE } from "@/web/kit";

export type IdInfo = { id: string; name: string; role: string; idNo: string; desk: number; born: number; maker: string; kind: string; chips: string[]; memory: boolean; look: number | null | undefined | FaceLook; bg?: string; level?: number };

/** webapp/lib/store agentIdNo: a stable card number from the agent id. */
export function agentIdNo(id: string) {
  let h = 2166136261;
  for (const ch of `id-${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h >>>= 0;
  return `LX-${String(h % 10000).padStart(4, "0")}-${String((h >>> 14) % 1000).padStart(3, "0")}`;
}
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const SPRING = Easing.bezier(0.3, 1.35, 0.5, 1);

export default function AgentIdCard({ info, faceEl }: { info: IdInfo; faceEl?: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const f = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    let on = true;
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then((r) => {
      if (on && !r) sway.value = withRepeat(withSequence(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: 2500, easing: Easing.inOut(Easing.sin) })), -1, true);
    });
    return () => { on = false; };
  }, [sway]);
  const flip = () => { const to = flipped ? 0 : 180; setFlipped(!flipped); f.value = withTiming(to, { duration: 700, easing: SPRING }); };
  const rig = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value * 1.6}deg` }] }));
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${f.value}deg` }], opacity: f.value < 90 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${f.value + 180}deg` }], opacity: f.value >= 90 ? 1 : 0 }));
  const desk = `Desk ${String(info.desk).padStart(2, "0")}`;
  const lv = info.level ?? 1;
  const face = faceEl ?? (info.kind === "Hired" ? <Face slug={info.id} size={96} animated /> : <AgentFace variant={lookVariant(info.look)} size={96} animated />);
  const card = { borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backfaceVisibility: "hidden" as const };
  const shadow = { shadowColor: "#140050", shadowOpacity: 0.55, shadowRadius: 25, shadowOffset: { width: 0, height: 26 }, elevation: 12 };
  const facts: [string, string, boolean?][] = [["ID number", info.idNo, true], ["Desk", desk], ["Role", info.role], ["Born", fmtDate(info.born)], [info.kind === "Hired" ? "Maker" : "Owner", info.maker], ["Memory", info.memory ? "On" : "Off"]];
  return (
    <Animated.View style={[{ alignItems: "center", alignSelf: "center", transformOrigin: "50% 0%" }, rig]}>
      <View style={{ zIndex: 10 }}><Clip w={44} h={24} hole={[20, 8]} /></View>
      <Pressable onPress={flip} accessibilityRole="button" accessibilityState={{ selected: flipped }}
        accessibilityLabel={flipped ? `${info.name}'s ID card, back. Press to see the front.` : `${info.name}'s ID card. Press to flip.`} style={{ marginTop: -8, width: 268 }}>
        {/* FRONT */}
        <Animated.View style={[card, shadow, { padding: 12 }, front]} pointerEvents={flipped ? "none" : "auto"}>
          <View style={{ alignSelf: "center", marginBottom: 8, width: 56, height: 8, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.1)" }} />
          <View style={{ borderRadius: 16, backgroundColor: GRAPE, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" }}>
            <Disp s={18} c="#fff" style={{ lineHeight: 18 }}>HELLO</Disp>
            <Lbl s={8.5} c="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>my name is</Lbl>
          </View>
          <View style={{ marginTop: 10, height: 128, borderRadius: 16, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <BgArt id={info.bg} />
            <View>{face}</View>
            <Lbl s={8.5} c="rgba(255,255,255,0.7)" style={{ position: "absolute", left: 12, top: 12 }}>LEXARI</Lbl>
            <View style={{ position: "absolute", right: 12, top: 12, borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 2 }}><Lbl s={8.5} c="#fff">● online</Lbl></View>
            {lv > 1 ? <View style={{ position: "absolute", right: 12, bottom: 10, borderRadius: 999, backgroundColor: lv >= 10 ? "#e8b84a" : "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 2 }}><Lbl s={8} c={lv >= 10 ? "#3b2600" : "#fff"}>{lv >= 10 ? "★ Legend" : `Lv ${lv}`}</Lbl></View> : null}
            <Lbl s={8} c="rgba(255,255,255,0.55)" style={{ position: "absolute", left: 12, bottom: 10 }}>{info.idNo}</Lbl>
          </View>
          <View style={{ paddingHorizontal: 4, paddingTop: 10 }}>
            <Disp s={22} lines={1} style={{ lineHeight: 24 }}>{info.name}</Disp>
            <View style={{ marginTop: 6, flexDirection: "row", flexWrap: "wrap", columnGap: 6, rowGap: 4 }}>
              {[info.role, "·", desk, "·", `Born ${fmtDate(info.born)}`].map((t, i) => <Lbl key={i} s={8.5} c="rgba(0,0,0,0.6)">{t}</Lbl>)}
            </View>
            <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              {info.chips.slice(0, 3).map((c) => <View key={c} style={{ borderRadius: 999, backgroundColor: "#0a0a0a", paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ fontFamily: F.semi, fontSize: 10.5, color: "#fff" }}>{c}</Text></View>)}
            </View>
            <View style={{ marginTop: 10 }}><Barcode text={`${info.name}${info.idNo}`} /></View>
          </View>
        </Animated.View>
        {/* BACK */}
        <Animated.View style={[card, { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden" }, back]} pointerEvents={flipped ? "auto" : "none"}>
          <View style={{ alignSelf: "center", marginTop: 12, width: 56, height: 8, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.1)" }} />
          <View style={{ marginTop: 10, height: 40, backgroundColor: "#0a0a0a" }} />
          <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <CardLogo scale={0.6} />
              <View style={{ borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 2 }}><Lbl s={8} c="#fff">Agent ID</Lbl></View>
            </View>
            <View style={{ marginTop: 10 }}>
              <Lbl s={8} c="rgba(0,0,0,0.5)">Card holder</Lbl>
              <Disp s={20} lines={1} style={{ lineHeight: 22 }}>{info.name}</Disp>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
              {facts.map(([kk, val, mono], i) => (
                <View key={kk} style={{ width: "50%", paddingRight: i % 2 ? 0 : 6, paddingLeft: i % 2 ? 6 : 0 }}>
                  <Lbl s={8} c="rgba(0,0,0,0.5)">{kk}</Lbl>
                  <Text numberOfLines={1} style={{ fontFamily: mono ? F.monoB : F.semi, fontSize: mono ? 11.5 : 12, lineHeight: 15, color: "#0a0a0a" }}>{val}</Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "flex-end", gap: 12, paddingTop: 12 }}>
              <View style={{ width: 62, height: 62, borderRadius: 6, padding: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }}><Code text={`${info.id}${info.idNo}`} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ borderBottomWidth: 2, borderBottomColor: "rgba(0,0,0,0.7)", paddingBottom: 2 }}><Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 18, lineHeight: 20, fontStyle: "italic", color: GRAPE }}>{info.name}</Text></View>
                <Lbl s={7.5} c="rgba(0,0,0,0.5)" style={{ marginTop: 4 }}>Agent signature</Lbl>
              </View>
            </View>
            <Text style={{ marginTop: 10, fontFamily: F.sans, fontSize: 9, lineHeight: 12.5, color: "rgba(0,0,0,0.55)" }}>{`${info.kind} agent · Property of Lexari. If found, please return to Lexari. Not valid for real doors.`}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
