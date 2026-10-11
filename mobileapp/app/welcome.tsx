/**
 * First run, before sign-in: four paged screens told with the landing art (lexari.ai), same words.
 * 1 the hanging hero badge, 2 the agent's own desk (first shift), 3 memory notes, 4 the roster.
 * Motion: art and words move at different speeds while you swipe (parallax), words rise in one by one on each page,
 * the background glows drift between pages, the dots stretch with the swipe and the button morphs on the last page.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, interpolate, interpolateColor, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop, Circle } from "react-native-svg";
import { Face, tap } from "@/components/ui";
import Badge, { badgeCopy } from "@/components/Badge";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { COPY, DeskShift, Display, LandingLogo, MemoryNotes, RosterFan, SectionLabel } from "@/components/Landing";
import { F, GRAPE, Rise } from "@/web/kit";

const PAGES = [
  { key: "hero", label: "", title: "", body: "" },
  { key: "desk", label: COPY.desk.label, title: COPY.desk.title, body: COPY.desk.body },
  { key: "memory", label: COPY.memory.label, title: COPY.memory.title, body: COPY.memory.body },
  { key: "roster", label: COPY.roster.label, title: COPY.roster.title, body: COPY.roster.body },
] as const;
const N = PAGES.length;
const FACES = ["scout", "quill", "tally", "frame", "patch"] as const;

/** Scales its child down (never up) so it always fits the space it's given. */
function Fit({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [kid, setKid] = useState({ w: 0, h: 0 });
  const s = box.h && kid.h ? Math.min(1, box.h / kid.h, box.w / kid.w) : 1;
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", overflow: "visible" }} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <View onLayout={(e: LayoutChangeEvent) => setKid({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={{ transform: [{ scale: s }], opacity: kid.h ? 1 : 0 }}>{children}</View>
    </View>
  );
}

/** Drifting grape glows: they slide and change strength from page to page. */
function Glows({ x, width, height }: { x: SharedValue<number>; width: number; height: number }) {
  const breathe = useSharedValue(0);
  useEffect(() => { breathe.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true); }, [breathe]);
  const pages = PAGES.map((_, i) => i * width);
  const a = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(x.value, pages, [width * 0.35, -width * 0.25, width * 0.2, -width * 0.3], "clamp") },
      { translateY: interpolate(x.value, pages, [-height * 0.12, height * 0.05, -height * 0.02, height * 0.1], "clamp") + breathe.value * 18 },
      { scale: 1 + breathe.value * 0.08 },
    ],
  }));
  const b = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, pages, [0.55, 0.9, 0.7, 1], "clamp"),
    transform: [
      { translateX: interpolate(x.value, pages, [-width * 0.3, width * 0.3, -width * 0.2, width * 0.15], "clamp") },
      { translateY: interpolate(x.value, pages, [height * 0.3, height * 0.22, height * 0.35, height * 0.2], "clamp") - breathe.value * 14 },
    ],
  }));
  const blob = (id: string, o: number) => (
    <Svg width={width * 1.3} height={width * 1.3}>
      <Defs><RadialGradient id={id} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#5b2bff" stopOpacity={o} /><Stop offset="1" stopColor="#5b2bff" stopOpacity="0" /></RadialGradient></Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height, overflow: "hidden" }}>
      <Animated.View style={[{ position: "absolute", left: -width * 0.15, top: 0 }, a]}>{blob("ga", 0.75)}</Animated.View>
      <Animated.View style={[{ position: "absolute", left: -width * 0.15, top: 0 }, b]}>{blob("gb", 0.5)}</Animated.View>
    </View>
  );
}

/** The office carpet dots, sliding a little slower than the pages. */
function Carpet({ x, width, height }: { x: SharedValue<number>; width: number; height: number }) {
  const cols = Math.ceil((width * 1.4) / 22), rows = Math.ceil(height / 22);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -(x.value * 0.08) % 22 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, st]}>
      <Svg width={cols * 22} height={height}>{Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((__, c) => <Circle key={`${c}-${r}`} cx={c * 22 + 1} cy={r * 22 + 1} r={1} fill="rgba(255,255,255,0.1)" />))}</Svg>
    </Animated.View>
  );
}

/** One page: the art drifts against the swipe, the words follow a touch behind. */
function Page({ i, x, width, active, children, label, title, body, hero }: { i: number; x: SharedValue<number>; width: number; active: boolean; children: ReactNode; label: string; title: string; body: string; hero: number }) {
  const art = useAnimatedStyle(() => {
    const d = (x.value - i * width) / width;
    return { opacity: interpolate(Math.abs(d), [0, 0.7], [1, 0], "clamp"), transform: [{ translateX: d * width * 0.45 }, { scale: interpolate(Math.abs(d), [0, 1], [1, 0.82], "clamp") }, { rotate: `${d * -6}deg` }] };
  });
  const words = useAnimatedStyle(() => {
    const d = (x.value - i * width) / width;
    return { opacity: interpolate(Math.abs(d), [0, 0.5], [1, 0], "clamp"), transform: [{ translateX: d * width * 0.18 }] };
  });
  const [seen, setSeen] = useState(0);
  useEffect(() => { if (active) setSeen((n) => n + 1); }, [active]);
  return (
    <View style={{ width, flex: 1, paddingHorizontal: 20 }}>
      <Animated.View style={[{ flex: 1, paddingTop: i === N - 1 ? 56 : 6, paddingBottom: 14 }, art]}>{children}</Animated.View>
      <Animated.View style={words} key={seen}>
        {i === 0 ? (
          <>
            <Rise delay={40}><Display s={hero} style={{ lineHeight: hero * 0.98 }}>{COPY.hero.title[0]}</Display></Rise>
            <Rise delay={110}><Display s={hero} c="#a58bff" style={{ lineHeight: hero * 0.98 }}>{COPY.hero.title[1]}</Display></Rise>
            <Rise delay={180}><Display s={hero * 0.5} c="rgba(255,255,255,0.85)" style={{ marginTop: 10 }}>{`${COPY.hero.subtitle} ↗`}</Display></Rise>
          </>
        ) : (
          <>
            <Rise delay={40} x={-24} y={0}><SectionLabel>{label}</SectionLabel></Rise>
            <Rise delay={120}><Display s={hero * 0.84} style={{ marginTop: 14, lineHeight: hero * 0.84 }}>{title}</Display></Rise>
            <Rise delay={220}><Text style={{ marginTop: 12, fontFamily: F.sans, fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.72)" }}>{body}</Text></Rise>
          </>
        )}
      </Animated.View>
    </View>
  );
}

function Dot({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const st = useAnimatedStyle(() => {
    const d = Math.abs(x.value / width - i);
    return { width: interpolate(d, [0, 1], [28, 8], "clamp"), backgroundColor: interpolateColor(Math.min(1, d), [0, 1], ["#a58bff", "rgba(255,255,255,0.28)"]) };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, st]} />;
}

/** Faces that bob around the roster page. */
function FloatFace({ slug, i, x, width, left, top, size }: { slug: string; i: number; x: SharedValue<number>; width: number; left: number; top: number; size: number }) {
  const bob = useSharedValue(0);
  useEffect(() => { bob.value = withDelay(i * 260, withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })), -1)); }, [bob, i]);
  const st = useAnimatedStyle(() => {
    const d = x.value / width - (N - 1);
    return { opacity: interpolate(d, [-0.6, 0], [0, 1], "clamp"), transform: [{ translateY: bob.value * -6 - d * 40 * (1 + i * 0.3) }, { translateX: d * width * (0.2 + i * 0.1) }, { rotate: `${(i % 2 ? 6 : -6) + bob.value * (i % 2 ? -8 : 8) + d * 40}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left, top, width: size + 8, height: size + 8, borderRadius: size * 0.34, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }, st]}><Face slug={slug} size={size} /></Animated.View>;
}

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = usePrefs();
  const { token } = useSession();
  const [name, setName] = useState(badgeCopy.defaultName);
  const [page, setPage] = useState(0);
  const x = useSharedValue(0);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const pageRef = useRef(0);
  const hero = Math.min(46, Math.max(36, width * 0.112));
  const W = width - 40;
  const done = () => { setOnboarded(); router.replace(token ? "/(tabs)/agents" : { pathname: "/(auth)/sign-in", params: { name: name.trim() || badgeCopy.defaultName } }); };
  const settle = (p: number) => { if (p !== pageRef.current) { pageRef.current = p; setPage(p); tap(); } };
  const go = (p: number) => { ref.current?.scrollTo({ x: width * p, animated: true }); settle(p); };
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { x.value = e.contentOffset.x; } });
  const last = page === N - 1;
  const cta = useAnimatedStyle(() => {
    const t = interpolate(x.value / width, [N - 2, N - 1], [0, 1], "clamp");
    return { backgroundColor: interpolateColor(t, [0, 1], [GRAPE, "#ffffff"]), borderBottomColor: interpolateColor(t, [0, 1], ["#3514b0", GRAPE]) };
  });
  const faceSize = Math.round(Math.min(34, width * 0.085));

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Carpet x={x} width={width} height={height} />
      <Glows x={x} width={width} height={height} />
      {FACES.map((s, i) => <FloatFace key={s} slug={s} i={i} x={x} width={width} size={faceSize} left={width / 2 + (i - 2) * (faceSize + 22) - (faceSize + 8) / 2} top={insets.top + 62} />)}

      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, height: insets.top + 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <LandingLogo scale={0.85} />
        <Pressable onPress={() => { tap(); done(); }} hitSlop={12} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.22)", justifyContent: "center", opacity: last ? 0 : 1 }} disabled={last}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: "#fff" }}>Skip</Text>
        </Pressable>
      </View>

      <Animated.ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => settle(Math.round(e.nativeEvent.contentOffset.x / width))} onScrollEndDrag={(e) => settle(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }} contentContainerStyle={{ height: "100%" }}>
        {PAGES.map((p, i) => (
          <Page key={p.key} i={i} x={x} width={width} active={page === i} label={p.label} title={p.title} body={p.body} hero={hero}>
            {i === 0 ? <Fit><Badge name={name} setName={setName} strap={56} /></Fit>
              : i === 1 ? <Fit><DeskShift width={W} /></Fit>
              : i === 2 ? <Fit><MemoryNotes width={W} /></Fit>
              : <Fit><RosterFan width={W} /></Fit>}
          </Page>
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 18, paddingTop: 16, gap: 18 }}>
        <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
          {PAGES.map((p, i) => <Pressable key={p.key} accessibilityLabel={`Page ${i + 1} of ${N}`} hitSlop={8} onPress={() => go(i)}><Dot i={i} x={x} width={width} /></Pressable>)}
        </View>
        <Pressable accessibilityRole="button" onPress={() => { tap(); last ? done() : go(page + 1); }}>
          {({ pressed }) => (
            <Animated.View style={[{ height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, transform: [{ translateY: pressed ? 2 : 0 }] }, cta]}>
              <Text style={{ fontFamily: F.bold, fontSize: 17, color: last ? "#0a0a0a" : "#fff" }}>{last ? `Hire ${name.trim() || "your agent"} →` : page === 0 ? "See it at work →" : "Next →"}</Text>
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
