/** Splash: the Lexari mark pops in alone on black, then "lexari" types out letter by letter beside it, then we fade into the app (~2.2 s). */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { T } from "@/web/kit";

SplashScreen.preventAutoHideAsync().catch(() => {});
const WORD = "lexari".split("");

export default function Splash() {
  const { ready, token } = useSession();
  const { loaded, onboarded, securityAsked } = usePrefs();
  const [played, setPlayed] = useState(false);
  const mark = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const letters = useRef(WORD.map(() => new Animated.Value(0))).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.sequence([
      Animated.spring(mark, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(slide, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.stagger(85, letters.map((l) => Animated.timing(l, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2)), useNativeDriver: true }))),
      ]),
      Animated.delay(450),
    ]).start(() => setPlayed(true));
  }, [mark, slide, letters]);

  useEffect(() => {
    if (!played || !ready || !loaded) return;
    const next = !onboarded ? "/welcome" : !token ? "/(auth)/sign-in" : !securityAsked ? "/security-setup" : "/(tabs)/agents";
    Animated.timing(out, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => router.replace(next));
  }, [played, ready, loaded, onboarded, token, securityAsked, out]);

  // the mark starts centred alone, then moves left to make room for the word
  const shift = slide.interpolate({ inputRange: [0, 1], outputRange: [84, 0] });
  return (
    <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ flexDirection: "row", alignItems: "center", opacity: out, transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }}>
        <Animated.View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", opacity: mark.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ translateX: shift }, { scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ["-25deg", "0deg"] }) }] }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#000" }} />
        </Animated.View>
        <View style={{ flexDirection: "row", marginLeft: 14 }}>
          {WORD.map((ch, i) => (
            <Animated.View key={i} style={{ opacity: letters[i], transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
              <T f="display" s={46} c="#fff" style={{ letterSpacing: -1.5 }}>{ch}</T>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
