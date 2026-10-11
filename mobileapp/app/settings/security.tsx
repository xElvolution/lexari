import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { Screen, Title, Row, Muted } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { SecurityRows } from "@/components/SecurityRows";

type Sec = { settings?: { phrase?: string; dailySendCapUsd?: number }; sessions?: { id: string; device: string; current?: boolean }[] };

export default function Security() {
  const { token } = useSession();
  const { palette } = usePrefs();
  const [sec, setSec] = useState<Sec | null>(null);
  useEffect(() => { ScreenCapture.preventScreenCaptureAsync().catch(() => {}); load().catch(() => {}); }, [token]);

  const load = async () => {
    if (!token) return;
    setSec(await api<Sec>("/api/security", {}, token).catch(() => null));
  };

  return (
    <Screen>
      <Title>Security</Title>
      <ScrollView>
        <Muted>Phrase {sec?.settings?.phrase || "not set"} · daily cap ${sec?.settings?.dailySendCapUsd ?? "—"}</Muted>
        <SecurityRows />
        {(sec?.sessions || []).map((s) => <Row key={s.id} title={s.device} detail={s.current ? "This phone" : "Other"} />)}
        <Text style={{ color: palette.muted, fontSize: 11, marginTop: 8 }}>Payments still need your approval on the server. The app lock only protects this phone.</Text>
      </ScrollView>
    </Screen>
  );
}
