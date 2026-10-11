import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { LogoMark } from "@/components/Logo";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Animated launch: the mark pops in, a ring pulses out, the wordmark rises, then we route. */
export default function Splash() {
  const { ready, token } = useSession();
  const { loaded, onboarded, securityAsked } = usePrefs();
  const { width, height } = useWindowDimensions();
  const [played, setPlayed] = useState(false);

  const mark = useSharedValue(0);
  const ring = useSharedValue(0);
  const word = useSharedValue(0);
  const glow = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    mark.value = withSpring(1, { damping: 11, stiffness: 120, mass: 0.9 });
    glow.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });
    ring.value = withDelay(350, withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }), 2, false));
    word.value = withDelay(520, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    const t = setTimeout(() => setPlayed(true), 2100);
    return () => clearTimeout(t);
  }, [glow, mark, ring, word]);

  useEffect(() => {
    if (!played || !ready || !loaded) return;
    out.value = withTiming(0, { duration: 260 });
    const next = !onboarded ? "/welcome" : !token ? "/(auth)/sign-in" : !securityAsked ? "/security-setup" : "/(tabs)/hub";
    const t = setTimeout(() => router.replace(next), 240);
    return () => clearTimeout(t);
  }, [played, ready, loaded, onboarded, token, securityAsked, out]);

  const markSt = useAnimatedStyle(() => ({
    opacity: Math.min(1, mark.value * 1.4),
    transform: [{ scale: 0.55 + mark.value * 0.45 }, { rotate: `${(1 - mark.value) * -18}deg` }],
  }));
  const ringSt = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.55, transform: [{ scale: 1 + ring.value * 1.6 }] }));
  const wordSt = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 14 }] }));
  const glowSt = useAnimatedStyle(() => ({ opacity: glow.value }));
  const outSt = useAnimatedStyle(() => ({ opacity: out.value, transform: [{ scale: 1 + (1 - out.value) * 0.06 }] }));

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Animated.View style={[{ position: "absolute", width, height }, glowSt]} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="g" cx="50%" cy="44%" rx="70%" ry="45%">
              <Stop offset="0" stopColor="#5b2bff" stopOpacity="0.55" />
              <Stop offset="0.55" stopColor="#3514b0" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#g)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, outSt]}>
        <View style={{ alignItems: "center", justifyContent: "center", marginTop: -40 }}>
          <Animated.View style={[{ position: "absolute", width: 96, height: 96, borderRadius: 30, borderWidth: 2, borderColor: "#8f6bff" }, ringSt]} />
          <Animated.View style={markSt}><LogoMark size={96} /></Animated.View>
        </View>
        <Animated.View style={[{ alignItems: "center", marginTop: 26 }, wordSt]}>
          <Text style={{ color: "#fff", fontSize: 38, fontWeight: "700", letterSpacing: -1.6 }}>lexari</Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 6, letterSpacing: 0.2 }}>Meet your first personalized AI agent</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
