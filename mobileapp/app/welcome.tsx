/** Onboarding: Lexari's story told with the landing page itself (hero, 01 desk, 02 memory, 03 roster, 04 seats). Same words and art as lexari.ai. */
import { useRef, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tap } from "@/components/ui";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { BADGE, COPY, Display, HeroTitle, SectionLabel } from "@/components/Landing";
import { BRAND_BG, BrandBg, GlowIllustration } from "@/components/BrandBg";
import { GRAPE, T } from "@/web/kit";
import { LandingLogo } from "@/components/Landing";

const SECTIONS = [COPY.desk, COPY.memory, COPY.roster, COPY.seats];
const ART = ["monitor", "memory", "users", "team"];

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { setOnboarded } = usePrefs();
  const { token } = useSession();
  const [page, setPage] = useState(0);
  const [name] = useState(BADGE.defaultName);
  const ref = useRef<ScrollView>(null);
  const N = 5;
  const done = () => { setOnboarded(); router.replace(token ? "/(tabs)/agents" : { pathname: "/(auth)/sign-in", params: { name } }); };
  const go = (p: number) => { ref.current?.scrollTo({ x: width * p, animated: true }); setPage(p); };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => { const p = Math.round(e.nativeEvent.contentOffset.x / width); if (p !== page) { setPage(p); tap(); } };
  
  return (
    <View style={{ flex: 1, backgroundColor: BRAND_BG }}>
      <BrandBg width={width} height={height} cy="40%" />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, height: insets.top + 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <LandingLogo />
        {page < N - 1 ? <Pressable onPress={() => { tap(); done(); }} hitSlop={12} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", justifyContent: "center" }}><T f="bold" s={13} c="#fff">Skip</T></Pressable> : null}
      </View>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }}>
        <View style={{ width, paddingHorizontal: 20, paddingTop: 14 }}>
          <HeroTitle s={40} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><GlowIllustration size={220} /></View>
        </View>
        {SECTIONS.map((S, i) => (
          <View key={S.label} style={{ width, paddingHorizontal: 20, paddingTop: 10 }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><GlowIllustration icon={ART[i]} size={210} /></View>
            <SectionLabel>{S.label}</SectionLabel>
            <Display s={32} style={{ marginTop: 12 }}>{S.title}</Display>
            {S.body ? <T s={14.5} c="rgba(255,255,255,0.72)" style={{ marginTop: 10, lineHeight: 21 }}>{S.body}</T> : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 18, paddingTop: 10, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>{Array.from({ length: N }).map((_, i) => <Pressable key={i} onPress={() => go(i)} style={{ height: 6, width: i === page ? 24 : 6, borderRadius: 3, backgroundColor: i === page ? "#a58bff" : "rgba(255,255,255,0.3)" }} />)}</View>
        <Pressable onPress={() => { tap(); page >= N - 1 ? done() : go(page + 1); }} style={{ height: 56, borderRadius: 28, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "#3514b0" }}>
          <T f="bold" s={17} c="#fff">{page === 0 ? `Hire ${name || "your agent"} →` : page >= N - 1 ? "Get started →" : "Next →"}</T>
        </Pressable>
      </View>
    </View>
  );
}
