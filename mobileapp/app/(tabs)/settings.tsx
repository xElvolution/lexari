import { ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Bell, Brain, ChevronRight, Cpu, CreditCard, KeyRound, ListTodo, LogOut, Moon, Pickaxe, Plug, Shield, Sparkles, Users } from "lucide-react-native";
import { Face, Header, Muted, Row, Screen, SectionLabel } from "@/components/ui";
import { SecurityRows } from "@/components/SecurityRows";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { grape } from "@/theme/colors";

function Group({ children }: { children: React.ReactNode }) {
  const { palette } = usePrefs();
  return <View style={{ borderRadius: 20, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, paddingHorizontal: 12, paddingVertical: 2 }}>{children}</View>;
}

export default function SettingsTab() {
  const { signOut, wallet } = useSession();
  const { theme, setTheme, palette } = usePrefs();
  const chev = <ChevronRight color={palette.muted} size={16} />;
  const ic = (I: typeof Bell) => <I color={palette.brand} size={16} />;
  const links: [string, string, typeof Bell][] = [
    ["/settings/notifications", "Notifications", Bell],
    ["/settings/secrets", "Secrets", KeyRound],
    ["/settings/models", "Models", Cpu],
    ["/settings/billing", "Plans", CreditCard],
    ["/settings/integrations", "Integrations", Plug],
  ];
  const more: [string, string, typeof Bell][] = [
    ["/brain", "Brain", Brain],
    ["/team", "Team", Users],
    ["/tasks", "Tasks and meetings", ListTodo],
    ["/miner", "ORE Miner", Pickaxe],
    ["/settings/security", "Sessions and limits", Shield],
  ];
  return (
    <Screen>
      <Header title="Settings" pill />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, marginTop: 6 }}>
          <Face size={52} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.ink, fontSize: 16, fontWeight: "700" }}>My account</Text>
            <Muted>{wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)} · Solana devnet` : "Signed in"}</Muted>
          </View>
        </View>
        <SectionLabel>Security</SectionLabel>
        <Group><SecurityRows /></Group>
        <SectionLabel>Preferences</SectionLabel>
        <Group>
          <Row icon={ic(Moon)} title="Dark mode" right={<Switch value={theme !== "light"} onValueChange={(on) => setTheme(on ? "dark" : "light")} trackColor={{ true: grape, false: palette.tint }} thumbColor="#fff" />} />
          {links.map(([href, label, I]) => <Row key={href} icon={ic(I)} title={label} right={chev} onPress={() => router.push(href)} />)}
        </Group>
        <SectionLabel>More</SectionLabel>
        <Group>
          {more.map(([href, label, I]) => <Row key={href} icon={ic(I)} title={label} right={chev} onPress={() => router.push(href)} />)}
          <Row icon={ic(Sparkles)} title="Replay the intro" right={chev} onPress={() => router.push("/welcome")} />
        </Group>
        <View style={{ height: 14 }} />
        <Group><Row icon={<LogOut color="#ff6b81" size={16} />} title="Sign out" danger onPress={() => signOut().then(() => router.replace("/(auth)/sign-in"))} /></Group>
        <Muted style={{ textAlign: "center", marginTop: 18 }}>Lexari for Android · devnet</Muted>
      </ScrollView>
    </Screen>
  );
}
