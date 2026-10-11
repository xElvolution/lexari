import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import * as Device from "expo-device";
import { Screen, Title, Muted, ErrorText } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { isSolanaMobile } from "@/lib/device";
import { networkBadge } from "@/lib/network";
import { COINS } from "@/content/roster";
import { grape } from "@/theme/colors";
import { NetworkBanner } from "@/components/NetworkPill";

export default function Topup() {
  const params = useLocalSearchParams<{ coin?: string; hire?: string }>();
  const { token } = useSession();
  const { palette } = usePrefs();
  const seeker = isSolanaMobile({ brand: Device.brand, manufacturer: Device.manufacturer, model: Device.modelName });
  const ordered = seeker ? [...COINS].sort((a, b) => Number(b.id === "SKR") - Number(a.id === "SKR")) : COINS;
  const [coin, setCoin] = useState(params.coin || (seeker ? "SKR" : "USDC"));
  const [info, setInfo] = useState<{ address?: string; tag?: string } | null>(null);
  const [err, setErr] = useState("");
  const badge = networkBadge(env.cluster);

  const load = async (next: string) => {
    if (!token) return;
    setCoin(next);
    setErr("");
    try {
      setInfo(await api(`/api/topup/deposit`, { method: "POST", body: JSON.stringify({ rail: `${next}:solana` }) }, token));
    } catch (e) { setInfo(null); setErr(e instanceof Error ? e.message : "This rail is not open."); }
  };

  return (
    <Screen>
      <Title>{params.hire ? `Pay ${params.hire} in ${coin}` : "Top up"}</Title>
      <View style={{ marginTop: 6 }}><NetworkBanner /></View>
      <Muted>{seeker ? "SKR is first on this Seeker." : "Solana coins pay from your wallet. The server credits them once."}</Muted>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {ordered.map((c) => (
          <Pressable key={c.id} onPress={() => load(c.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 6, paddingRight: 12, height: 36, borderRadius: 18, backgroundColor: coin === c.id ? grape : palette.tint }}>
            <Image source={c.logo} style={{ width: 24, height: 24, borderRadius: 12 }} />
            <Text style={{ color: coin === c.id ? "#fff" : palette.ink, fontSize: 13, fontWeight: "700" }}>{c.id}</Text>
          </Pressable>
        ))}
      </View>
      {info?.address ? (
        <View style={{ marginTop: 18, gap: 8 }}>
          <View style={{ alignSelf: "flex-start", padding: 12, borderRadius: 18, backgroundColor: "#fff" }}><QRCode value={info.address} size={168} /></View>
          <Muted>{info.address}</Muted>
          {info.tag ? <Muted>Tag {info.tag}</Muted> : null}
        </View>
      ) : <Muted>Choose a coin to get the deposit address.</Muted>}
      {err ? <ErrorText text={err} /> : null}
    </Screen>
  );
}
