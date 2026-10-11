import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Check, Fingerprint, KeyRound, ScanFace } from "lucide-react-native";
import { Button, T, tap } from "@/components/ui";
import { PIN_LEN, PinDots, PinPad } from "@/components/PinPad";
import { usePrefs } from "@/state/prefs";
import { bioInfo, bioUnlock, type Bio } from "@/lib/bio";
import { savePin } from "@/lib/pin";

type Step = "intro" | "pin" | "confirm" | "done";

function Halo({ children }: { children: React.ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 0 })), -1); }, [p]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.5 }] }));
  return (
    <View style={{ width: 150, height: 150, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: "#8f6bff" }, ring]} />
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(91,43,255,0.22)", alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}

export default function SecuritySetup() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const changing = mode === "pin";
  const insets = useSafeAreaInsets();
  const { setBio, setLock, setSecurityAsked } = usePrefs();
  const [bio, setBioInfo] = useState<Bio | null>(null);
  const [bioOn, setBioOn] = useState(false);
  const [step, setStep] = useState<Step>(changing ? "pin" : "intro");
  const [first, setFirst] = useState("");
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(0);
  const [note, setNote] = useState("");
  const pop = useSharedValue(0);

  useEffect(() => { bioInfo().then(setBioInfo).catch(() => {}); }, []);
  useEffect(() => { if (step === "done") pop.value = withSpring(1, { damping: 9 }); }, [step, pop]);
  const popSt = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: pop.value }));

  const finish = () => {
    setSecurityAsked();
    if (changing) router.back(); else router.replace("/(tabs)/hub");
  };

  const enableBio = async () => {
    if (!bio?.ok) return;
    if (await bioUnlock(`Turn on ${bio.label}`)) {
      setBio(true); setLock(true); setBioOn(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setNote(`${bio.label} is on. Add a backup PIN in case it can't read you.`);
      setStep("pin");
    }
  };

  const onPin = async (v: string) => {
    setPin(v);
    if (v.length < PIN_LEN) return;
    if (step === "pin") {
      if (/^(\d)\1{5}$/.test(v) || "0123456789".includes(v) || "9876543210".includes(v)) {
        setNote("That PIN is too easy to guess. Try another."); setShake((s) => s + 1); setTimeout(() => setPin(""), 250); return;
      }
      setFirst(v); setTimeout(() => { setPin(""); setStep("confirm"); setNote(""); }, 150);
    } else if (step === "confirm") {
      if (v !== first) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setShake((s) => s + 1); setNote("Those PINs didn't match. Start again.");
        setTimeout(() => { setPin(""); setFirst(""); setStep("pin"); }, 400); return;
      }
      await savePin(v); setLock(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("done");
    }
  };

  const wrap = { flex: 1, backgroundColor: "#000", paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 };

  if (step === "intro") {
    const BioIcon = bio?.face ? ScanFace : Fingerprint;
    return (
      <View style={wrap}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable hitSlop={12} onPress={() => { tap(); finish(); }}><Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "600" }}>Skip</Text></Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Halo><BioIcon color="#c9b8ff" size={58} strokeWidth={1.6} /></Halo>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700", letterSpacing: -0.9, marginTop: 28, textAlign: "center" }}>Lock Lexari to you</Text>
          <Text style={[T.body, { color: "rgba(255,255,255,0.6)", marginTop: 10, textAlign: "center", maxWidth: 310, fontSize: 14.5, lineHeight: 21 }]}>
            {bio?.ok ? `Use ${bio.label} to open the app and approve payments. You can add a 6-digit PIN as a backup.` : "Set a 6-digit PIN to open the app and approve payments. You can turn this off any time in Settings."}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {bio?.ok ? <Button label={`Use ${bio.label}`} icon={<BioIcon color="#fff" size={18} />} onPress={enableBio} /> : null}
          <Button kind={bio?.ok ? "ghost" : "primary"} label="Set a 6-digit PIN" icon={<KeyRound color="#fff" size={18} />} onPress={() => { setNote(""); setStep("pin"); }} />
          <Pressable onPress={() => { tap(); finish(); }} style={{ height: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>Not now</Text></Pressable>
        </View>
      </View>
    );
  }

  if (step === "done") {
    return (
      <View style={wrap}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#34d399", alignItems: "center", justifyContent: "center" }, popSt]}><Check color="#04120c" size={48} strokeWidth={3} /></Animated.View>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", letterSpacing: -0.8, marginTop: 24 }}>{changing ? "PIN updated" : "You're protected"}</Text>
          <Text style={[T.body, { color: "rgba(255,255,255,0.6)", marginTop: 8, textAlign: "center", maxWidth: 300 }]}>{bioOn ? "Lexari opens with your biometrics, with your PIN as a backup." : "Lexari will ask for your PIN when it opens."}</Text>
        </View>
        <Button label={changing ? "Done" : "Enter Lexari"} onPress={finish} />
      </View>
    );
  }

  return (
    <View style={wrap}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", height: 20 }}>
        {!changing ? <Pressable hitSlop={12} onPress={() => { tap(); finish(); }}><Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: "600" }}>Skip</Text></Pressable> : null}
      </View>
      <View style={{ alignItems: "center", marginTop: 36 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(91,43,255,0.25)", alignItems: "center", justifyContent: "center" }}><KeyRound color="#c9b8ff" size={24} /></View>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", letterSpacing: -0.7, marginTop: 18 }}>{step === "pin" ? (changing ? "Choose a new PIN" : "Create your PIN") : "Confirm your PIN"}</Text>
        <Text style={[T.body, { color: note ? "#c9b8ff" : "rgba(255,255,255,0.55)", marginTop: 8, textAlign: "center", maxWidth: 300, minHeight: 38 }]}>{note || (step === "pin" ? "6 digits. It stays on this phone and only unlocks Lexari." : "Enter the same 6 digits again.")}</Text>
      </View>
      <View style={{ marginTop: 18 }}><PinDots value={pin} shake={shake} /></View>
      <View style={{ flex: 1, justifyContent: "flex-end" }}><PinPad value={pin} onChange={onPin} /></View>
    </View>
  );
}
