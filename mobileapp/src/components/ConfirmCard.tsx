import { Pressable, Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { usePrefs } from "@/state/prefs";
import { NetworkBanner } from "./NetworkPill";
import { grape } from "@/theme/colors";

/** A payment your agent wants to make. Nothing moves until you review and approve it. */
export function ConfirmCard({ title, amount, to, phrase, onReview }: {
  title: string; amount: string; to: string; phrase?: string; onReview: () => void;
}) {
  const { palette } = usePrefs();
  return (
    <View style={{ marginTop: 8, backgroundColor: palette.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(143,107,255,0.4)", gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><ShieldCheck color={palette.brand} size={14} /><Text style={{ color: palette.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>NEEDS YOUR OK</Text></View>
        <NetworkBanner />
      </View>
      <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "600" }}>{title}</Text>
      <Text style={{ color: palette.ink, fontSize: 22, fontWeight: "700", letterSpacing: -0.6 }}>{amount}</Text>
      <Text style={{ color: palette.muted, fontSize: 12 }}>To {to}</Text>
      {phrase ? <Text style={{ color: palette.ink, fontSize: 12 }}>Phrase: {phrase}</Text> : null}
      <Pressable onPress={onReview} style={({ pressed }) => ({ marginTop: 6, backgroundColor: grape, borderRadius: 12, height: 40, justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ color: "#fff", textAlign: "center", fontSize: 14, fontWeight: "600" }}>Review and approve</Text>
      </Pressable>
    </View>
  );
}
