import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { ArrowDownLeft, ArrowUpRight, Copy, Eye, EyeOff, QrCode, ShieldCheck } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Header, IconButton, Muted, Notice, Screen, SectionLabel, Sheet, Skeleton, T, friendly, tap } from "@/components/ui";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { api } from "@/lib/api";
import { COINS } from "@/content/roster";
import { grape } from "@/theme/colors";

type WalletRes = { balance?: { usd?: number; micros?: number } };
type Sec = { settings?: { phrase?: string; dailySendCapUsd?: number } };

export default function WalletTab() {
  const { token, wallet } = useSession();
  const { palette, hideBalances, toggleBalances } = usePrefs();
  const [data, setData] = useState<WalletRes | null>(null);
  const [sec, setSec] = useState<Sec | null>(null);
  const [msg, setMsg] = useState("");
  const [recv, setRecv] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [w, s] = await Promise.all([api<WalletRes>("/api/wallet", {}, token), api<Sec>("/api/security", {}, token).catch(() => null)]);
      setData(w); setSec(s); setMsg("");
    } catch (e) { setData({}); setMsg(friendly(e, "Your wallet didn't load.")); }
  }, [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const usd = data?.balance?.usd != null ? data.balance.usd : data?.balance?.micros != null ? data.balance.micros / 1_000_000 : null;
  const short = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "";
  const copy = async () => { if (!wallet) return; await Clipboard.setStringAsync(wallet); tap(); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  const Action = ({ label, Icon, onPress }: { label: string; Icon: typeof QrCode; onPress: () => void }) => (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}><Icon color="#fff" size={19} /></View>
      <Text style={{ color: "#fff", fontSize: 11.5, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <Header title="Wallet" pill right={<IconButton label={hideBalances ? "Show balances" : "Hide balances"} onPress={toggleBalances}>{hideBalances ? <EyeOff color={palette.ink} size={16} /> : <Eye color={palette.ink} size={16} />}</IconButton>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} refreshControl={<RefreshControl tintColor={grape} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ marginTop: 6, borderRadius: 26, padding: 18, backgroundColor: grape, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -60, top: -70, width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <View style={{ position: "absolute", left: -40, bottom: -90, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(0,0,0,0.12)" }} />
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>BALANCE</Text>
          {data === null ? <Skeleton w={150} h={34} style={{ marginTop: 8, backgroundColor: "rgba(255,255,255,0.2)" }} /> : (
            <Text style={{ color: "#fff", fontSize: 36, fontWeight: "700", letterSpacing: -1.4, marginTop: 4 }}>{hideBalances ? "••••••" : usd != null ? `$${usd.toFixed(2)}` : "$—"}</Text>
          )}
          {short ? <Pressable onPress={copy} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}><Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "monospace" }}>{copied ? "Copied" : short}</Text><Copy color="rgba(255,255,255,0.7)" size={12} /></Pressable> : null}
          <View style={{ flexDirection: "row", marginTop: 18 }}>
            <Action label="Top up" Icon={ArrowDownLeft} onPress={() => router.push("/topup")} />
            <Action label="Receive" Icon={QrCode} onPress={() => setRecv(true)} />
            <Action label="Send" Icon={ArrowUpRight} onPress={() => router.push("/chat/home?prompt=send")} />
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line }}>
          <ShieldCheck color="#34d399" size={18} />
          <Text style={[T.small, { color: palette.ink, flex: 1 }]}>Daily send cap <Text style={{ fontWeight: "700" }}>{sec?.settings?.dailySendCapUsd != null ? `$${sec.settings.dailySendCapUsd}` : "not set"}</Text>{sec?.settings?.phrase ? ` · phrase “${sec.settings.phrase}”` : ""}</Text>
        </View>

        <SectionLabel>Top up with</SectionLabel>
        <View style={{ borderRadius: 20, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, overflow: "hidden" }}>
          {COINS.map((c, i) => (
            <Pressable key={c.id} onPress={() => { tap(); router.push(`/topup?coin=${c.id}`); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? palette.tint : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: palette.line })}>
              <Image source={c.logo} style={{ width: 34, height: 34, borderRadius: 17 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "600" }}>{c.id}</Text>
                <Muted>{c.name}</Muted>
              </View>
              {c.id === "SKR" ? <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(20,241,217,0.12)" }}><Text style={{ color: "#14F1D9", fontSize: 10, fontWeight: "700" }}>BEST</Text></View> : null}
              <ArrowDownLeft color={palette.muted} size={16} />
            </Pressable>
          ))}
        </View>
        {msg ? <Notice text={msg} onRetry={load} /> : null}
      </ScrollView>
      <Sheet open={recv} onClose={() => setRecv(false)} title="Receive on Solana devnet">
        {wallet ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <View style={{ padding: 14, borderRadius: 20, backgroundColor: "#fff" }}><QRCode value={wallet} size={180} /></View>
            <Text style={{ color: palette.ink, fontFamily: "monospace", fontSize: 12, textAlign: "center" }}>{wallet}</Text>
            <Pressable onPress={copy} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Copy color={palette.brand} size={14} /><Text style={{ color: palette.brand, fontWeight: "600" }}>{copied ? "Copied" : "Copy address"}</Text></Pressable>
          </View>
        ) : <Muted>Connect a wallet to get a receive address.</Muted>}
      </Sheet>
    </Screen>
  );
}

