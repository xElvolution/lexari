import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Delete, Fingerprint, ScanFace } from "lucide-react-native";

export const PIN_LEN = 6;

/** Six dots that fill as you type, and shake on a wrong PIN. */
export function PinDots({ value, shake }: { value: string; shake: number }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (!shake) return;
    x.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(0, { duration: 50 }));
  }, [shake, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Animated.View style={[{ flexDirection: "row", gap: 16, justifyContent: "center" }, st]}>
      {Array.from({ length: PIN_LEN }).map((_, i) => <Dot key={i} on={i < value.length} />)}
    </Animated.View>
  );
}

function Dot({ on }: { on: boolean }) {
  const st = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(on ? 1.15 : 1, { damping: 12 }) }], backgroundColor: on ? "#8f6bff" : "transparent" }));
  return <Animated.View style={[{ width: 13, height: 13, borderRadius: 7, borderWidth: 1.5, borderColor: on ? "#8f6bff" : "rgba(255,255,255,0.35)" }, st]} />;
}

/** Number pad. The bottom-left key is biometric when offered. */
export function PinPad({ value, onChange, bio, onBio, disabled }: { value: string; onChange: (v: string) => void; bio?: "face" | "finger" | null; onBio?: () => void; disabled?: boolean }) {
  const press = (k: string) => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (k === "del") onChange(value.slice(0, -1));
    else if (value.length < PIN_LEN) onChange(value + k);
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: 14, columnGap: 26, maxWidth: 300, alignSelf: "center", opacity: disabled ? 0.4 : 1 }}>
      {keys.map((k) => {
        if (k === "bio" && !bio) return <View key={k} style={{ width: 72, height: 72 }} />;
        return (
          <Pressable key={k} accessibilityLabel={k === "del" ? "Delete" : k === "bio" ? "Use biometrics" : k} onPress={() => (k === "bio" ? onBio?.() : press(k))}
            style={({ pressed }) => ({ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(143,107,255,0.25)" : k === "del" || k === "bio" ? "transparent" : "rgba(255,255,255,0.06)" })}>
            {k === "del" ? <Delete color="#fff" size={24} /> : k === "bio" ? (bio === "face" ? <ScanFace color="#a58bff" size={28} /> : <Fingerprint color="#a58bff" size={28} />) : <Text style={{ color: "#fff", fontSize: 28, fontWeight: "500" }}>{k}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
