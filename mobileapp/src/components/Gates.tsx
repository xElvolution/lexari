export { NetworkBanner } from "./NetworkPill";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { bioInfo, bioUnlock, type Bio } from "@/lib/bio";
import { checkPin, clearPin, hasPin, lockoutState } from "@/lib/pin";
import { PIN_LEN, PinDots, PinPad } from "./PinPad";
import { Face, T } from "./ui";

const RELOCK_MS = 15_000;

/** App lock: on open and on return from background. Biometric first, PIN as fallback, lockout after misses. */
export function LockGate({ children }: { children: ReactNode }) {
  const { lockOn, bioOn, loaded, setLock, setBio } = usePrefs();
  const { token, signOut } = useSession();
  const [locked, setLocked] = useState(false);
  const away = useRef(0);
  const armed = useRef(false);

  useEffect(() => {
    if (!loaded || armed.current) return;
    armed.current = true;
    if (lockOn && token) setLocked(true);
  }, [loaded, lockOn, token]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") away.current = Date.now();
      if (s === "active" && away.current && Date.now() - away.current > RELOCK_MS && lockOn && token) setLocked(true);
    });
    return () => sub.remove();
  }, [lockOn, token]);

  const forgot = async () => {
    await clearPin(); setBio(false); setLock(false); setLocked(false);
    await signOut();
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && token ? <LockScreen bioOn={bioOn} onOpen={() => setLocked(false)} onForgot={forgot} /> : null}
    </View>
  );
}

function LockScreen({ bioOn, onOpen, onForgot }: { bioOn: boolean; onOpen: () => void; onForgot: () => void }) {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);
  const [note, setNote] = useState("");
  const [wait, setWait] = useState(0);
  const [bio, setBioInfo] = useState<Bio | null>(null);
  const [pinSet, setPinSet] = useState(true);
  const [mood, setMood] = useState<"idle" | "happy">("idle");

  const tryBio = useCallback(async (info: Bio | null) => {
    if (!bioOn || !info?.ok) return;
    if (await bioUnlock("Unlock Lexari")) { setMood("happy"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setTimeout(onOpen, 250); }
  }, [bioOn, onOpen]);

  useEffect(() => {
    hasPin().then(setPinSet).catch(() => {});
    lockoutState().then((f) => { if (f.until > Date.now()) setWait(f.until - Date.now()); }).catch(() => {});
    bioInfo().then((b) => { setBioInfo(b); tryBio(b); }).catch(() => {});
  }, [tryBio]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1000)), 1000);
    return () => clearInterval(t);
  }, [wait > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPin = async (v: string) => {
    setPin(v); setNote("");
    if (v.length < PIN_LEN) return;
    const r = await checkPin(v);
    if (r.ok) { setMood("happy"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); setTimeout(onOpen, 250); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setShake((s) => s + 1);
    setTimeout(() => setPin(""), 300);
    if (r.waitMs) { setWait(r.waitMs); setNote(""); } else setNote(`Wrong PIN. ${r.left} ${r.left === 1 ? "try" : "tries"} left.`);
  };

  const secs = Math.ceil(wait / 1000);
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(220)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: "#000", paddingTop: insets.top + 40, paddingBottom: insets.bottom + 18, paddingHorizontal: 24 }}>
      <View style={{ alignItems: "center" }}>
        <Face size={84} mood={mood} animated />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: -0.6, marginTop: 14 }}>Welcome back</Text>
        <Text style={[T.body, { color: wait ? "#ffb4c0" : note ? "#ffb4c0" : "rgba(255,255,255,0.55)", marginTop: 6, minHeight: 20 }]}>
          {wait ? `Too many tries. Wait ${secs}s.` : note || (pinSet ? "Enter your PIN to unlock" : `Use ${bio?.label || "biometrics"} to unlock`)}
        </Text>
      </View>
      {pinSet ? <View style={{ marginTop: 26 }}><PinDots value={pin} shake={shake} /></View> : null}
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {pinSet ? <PinPad value={pin} onChange={onPin} disabled={!!wait} bio={bioOn && bio?.ok ? (bio.face ? "face" : "finger") : null} onBio={() => tryBio(bio)} /> : null}
        <Pressable onPress={onForgot} style={{ marginTop: 18, alignItems: "center", height: 36, justifyContent: "center" }}>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Forgot PIN? Sign out</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** Extra local confirmation before money moves. The server still requires its own step-up. */
export async function biometricGate(reason: string): Promise<boolean> {
  const b = await bioInfo();
  if (!b.ok) return true;
  return bioUnlock(reason);
}
