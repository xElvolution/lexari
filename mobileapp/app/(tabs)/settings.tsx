/** Port of webapp/app/(app)/settings/page.tsx at phone width: the section list first, then one section with a back button. */
import { useEffect, useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import Icon from "@/components/Icon";
import { SecurityRows } from "@/components/SecurityRows";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { AgentTile, F, GRAPE, Label, Pill, T, WSheet, ringOf, short, useC } from "@/web/kit";
import { primaryOf, useData } from "@/web/data";

const SECTIONS = [
  { id: "general", label: "General", icon: "settings" },
  { id: "personal", label: "Personalization", icon: "spark" },
  { id: "agents", label: "Agents", icon: "team" },
  { id: "models", label: "Models", icon: "chip" },
  { id: "notifications", label: "Notifications", icon: "chat" },
  { id: "data", label: "Data controls", icon: "folder" },
  { id: "security", label: "Security", icon: "pin" },
  { id: "accounts", label: "Account", icon: "globe" },
  { id: "social", label: "Connected accounts", icon: "link" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "secrets", label: "Secrets", icon: "key" },
  { id: "billing", label: "Billing", icon: "wallet" },
  { id: "about", label: "About", icon: "list" },
] as const;
type Sec = (typeof SECTIONS)[number]["id"];

function Group({ title, children }: { title?: string; children: ReactNode }) {
  const k = useC();
  return (
    <View style={{ marginTop: 22 }}>
      {title ? <Label s={9.5} c={k.ink45} style={{ marginBottom: 6 }}>{title}</Label> : null}
      <View style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, paddingHorizontal: 16 }}>{children}</View>
    </View>
  );
}
function Row({ title, desc, children, danger, last }: { title: string; desc?: string; children?: ReactNode; danger?: boolean; last?: boolean }) {
  const k = useC();
  return (
    <View style={{ paddingVertical: 14, gap: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: k.line }}>
      <View><T f="semi" s={15} c={danger ? "#e5484d" : k.ink}>{title}</T>{desc ? <T s={13.5} c={k.ink60} style={{ marginTop: 2, lineHeight: 18 }}>{desc}</T> : null}</View>
      {children ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{children}</View> : null}
    </View>
  );
}
function Small({ label, icon, onPress }: { label: string; icon?: string; onPress: () => void }) {
  const k = useC();
  return <Pressable onPress={onPress} style={{ height: 40, borderRadius: 20, backgroundColor: k.tint, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>{icon ? <Icon name={icon} size={15} color={k.ink} /> : null}<T f="semi" s={14}>{label}</T></Pressable>;
}
function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  const k = useC();
  return <Switch value={on} onValueChange={set} trackColor={{ true: GRAPE, false: k.tint }} thumbColor="#fff" />;
}
function Select({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const k = useC();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ height: 40, borderRadius: 20, backgroundColor: k.tint, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 }}><T f="semi" s={14}>{options.find((o) => o[0] === value)?.[1] ?? value}</T><Icon name="right" size={14} color={k.ink60} /></Pressable>
      <WSheet open={open} title="Choose" onClose={() => setOpen(false)}>
        {options.map(([id, l]) => <Pressable key={id} onPress={() => { onChange(id); setOpen(false); }} style={{ paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: k.line }}><T f="semi" s={15}>{l}</T>{id === value ? <Icon name="check" size={16} color={k.brandInk} /> : null}</Pressable>)}
      </WSheet>
    </>
  );
}

function usePatch() {
  const { token } = useSession();
  const { reload } = useData();
  return async (body: Record<string, unknown>) => { if (!token) return; await api("/api/me", { method: "PATCH", body: JSON.stringify(body) }, token).catch(() => {}); await reload(); };
}

function General() {
  const k = useC();
  const { me } = useData();
  const { theme, setTheme } = usePrefs() as ReturnType<typeof usePrefs> & { theme?: string };
  const patch = usePatch();
  const p = (me?.prefs ?? {}) as Record<string, unknown>;
  const home = me?.agents.find((a) => a.slug === "home");
  return (
    <>
      <Group title="Appearance">
        <Row title="Theme" desc="Light, dark, or follow your device.">
          <View style={{ flexDirection: "row", backgroundColor: k.tint, borderRadius: 999, padding: 4 }}>
            {([["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "laptop", "System"]] as const).map(([id, ic, l]) => { const on = (theme ?? "dark") === id; return (
              <Pressable key={id} onPress={() => setTheme(id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: on ? k.card : "transparent" }}><Icon name={ic} size={14} color={on ? k.ink : k.ink60} /><T f="bold" s={13} c={on ? k.ink : k.ink60}>{l}</T></Pressable>
            ); })}
          </View>
        </Row>
        <Row last title="Animations" desc="Smooth motion across the app. Turn off for a calmer screen."><Toggle on={p.motion !== false} set={(v) => patch({ prefs: { motion: v } })} /></Row>
      </Group>
      <Group title="Language and voice">
        <Row title="Language" desc="Used for the app and your agents' replies."><Select value={String(p.language ?? "English")} options={["English", "Français", "Español", "Português", "Deutsch", "Yorùbá", "Hausa", "Igbo"].map((x) => [x, x])} onChange={(v) => patch({ prefs: { language: v } })} /></Row>
        <Row last title="Voices" desc="Each agent has its own voice for calls and Read aloud. Open an agent, tap Edit, then Voice."><Small icon="speaker" label={`${home?.name ?? "Your agent"}'s voice`} onPress={() => router.push("/agents/home")} /></Row>
      </Group>
      <Group title="Chats">
        <Row last title="Default agent" desc="Who opens first on the Agents page."><Select value={String(p.defaultAgent ?? "home")} options={(me?.agents ?? []).map((a) => [a.slug, a.name])} onChange={(v) => patch({ prefs: { defaultAgent: v } })} /></Row>
      </Group>
    </>
  );
}

const TONES: [string, string][] = [["short", "Short and clear"], ["warm", "Warm"], ["playful", "Playful"], ["formal", "Formal"]];
function Personal() {
  const k = useC();
  const { token } = useSession();
  const { me, reload } = useData();
  const patch = usePatch();
  const home = me?.agents.find((a) => a.slug === "home");
  const [name, setName] = useState(home?.name ?? "");
  const [you, setYou] = useState(String(home?.meta?.you ?? ""));
  const [ins, setIns] = useState(String((me?.prefs as Record<string, unknown> | undefined)?.instructions ?? ""));
  const save = async (extra: Record<string, unknown> = {}) => { if (!token || !home) return; await api("/api/agents", { method: "POST", body: JSON.stringify({ slug: "home", kind: "home", name: name.trim() || home.name, role: home.role ?? "", tone: (home as { tone?: string }).tone ?? "short", look: home.look ?? null, meta: { you: you.trim() }, ...extra }) }, token).catch(() => {}); await reload(); };
  const field = { marginTop: 6, height: 46, borderRadius: 14, backgroundColor: k.tint, paddingHorizontal: 14, color: k.ink, fontFamily: F.semi, fontSize: 15 } as const;
  return (
    <>
      <Group title="Your agent">
        <View style={{ paddingVertical: 16, gap: 12 }}>
          <View style={{ width: 96, height: 96, borderRadius: 26, backgroundColor: k.faceTile, borderWidth: 1, borderColor: k.line, alignItems: "center", justifyContent: "center" }}><AgentTile slug="home" look={home?.look} size={84} dot={false} /></View>
          <View><Label s={9.5} c={k.ink60}>Agent name</Label><TextInput value={name} onChangeText={(v) => setName(v.slice(0, 12))} style={field} /></View>
          <View><Label s={9.5} c={k.ink60}>It calls you</Label><TextInput value={you} onChangeText={(v) => setYou(v.slice(0, 20))} placeholder="Ada" placeholderTextColor={k.ink45} style={field} /></View>
          <Pill label="Save" h={40} style={{ alignSelf: "flex-start" }} disabled={!name.trim() || (name.trim() === home?.name && you.trim() === String(home?.meta?.you ?? ""))} onPress={() => save()} />
        </View>
        <Row last title="Tone" desc={`How ${home?.name ?? "your agent"} talks to you.`}><Select value={(home as { tone?: string } | undefined)?.tone ?? "short"} options={TONES} onChange={(v) => save({ tone: v })} /></Row>
      </Group>
      <Group title="Custom instructions">
        <View style={{ paddingVertical: 14 }}>
          <T s={13.5} c={k.ink60}>Anything every agent should know or do, every time.</T>
          <TextInput multiline value={ins} onChangeText={(v) => setIns(v.slice(0, 600))} placeholder="e.g. Keep answers short. I work from Lagos, so use WAT for times." placeholderTextColor={k.ink45} style={{ ...field, height: 110, paddingTop: 12, textAlignVertical: "top", marginTop: 10 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}><T s={12} c={k.ink45}>{`${ins.length}/600`}</T><Pill label="Save" h={40} onPress={() => patch({ prefs: { instructions: ins } })} /></View>
        </View>
      </Group>
      <Group title="Memory">
        <Row title="Memory" desc="Let agents remember useful things about you between chats."><Toggle on={(me?.prefs as Record<string, unknown> | undefined)?.memory !== false} set={(v) => patch({ prefs: { memory: v } })} /></Row>
        <Row last title="Manage memory" desc={`${me?.memories?.length ?? 0} things remembered. See, edit or forget any of them.`}><Small label="Open brain" onPress={() => router.navigate("/(tabs)/brain")} /></Row>
      </Group>
    </>
  );
}

function AgentsSec() {
  const { me } = useData();
  const k = useC();
  const primary = primaryOf(me);
  const list = me?.agents ?? [];
  return (
    <>
      <Group title={`Your team · ${list.length} agent${list.length === 1 ? "" : "s"}`}>
        {list.map((a, i) => (
          <View key={a.slug} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: k.line }}>
            <AgentTile slug={a.slug} look={a.look} size={44} ring={ringOf(a.slug, a.kind, primary)} />
            <View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T f="semi" s={15}>{a.name}</T>{a.slug === primary ? <View style={{ backgroundColor: k.tint, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}><Label s={8}>Default</Label></View> : null}</View><T s={13} c={k.ink45}>{`${a.role || (a.kind === "home" ? "Your agent" : "Specialist")} · seat ${String(i + 1).padStart(2, "0")}`}</T></View>
            <Small label="Chat" onPress={() => router.push(`/chat/${a.slug}`)} />
          </View>
        ))}
      </Group>
      <Group>
        <Row title="Add an agent" desc="Create your own, or hire a specialist from the marketplace."><Small label="Add agent" onPress={() => router.navigate("/(tabs)/marketplace")} /></Row>
        <Row last title="Your team" desc="Everyone you hired, and the specialists you can bring back for free."><Small label="Team" onPress={() => router.navigate("/(tabs)/team")} /></Row>
      </Group>
    </>
  );
}

function Models() {
  const k = useC();
  const { token } = useSession();
  const [m, setM] = useState<{ default?: string; prefs?: { on: string[] }; keys?: { provider: string }[] } | null>(null);
  useEffect(() => { if (token) api<typeof m>("/api/models", {}, token).then(setM).catch(() => setM({})); }, [token]);
  return (
    <>
      <Group title="Defaults">
        <Row last title="Account default" desc="Every agent without its own pick answers with this."><View style={{ height: 40, borderRadius: 20, backgroundColor: k.tint, paddingHorizontal: 16, justifyContent: "center" }}><T f="semi" s={14}>{m?.default === "lamina" ? "Lamina" : m?.default ?? "…"}</T></View></Row>
      </Group>
      <Group title="Models">
        {(m?.prefs?.on ?? []).map((id, i, a) => <Row key={id} last={i === a.length - 1} title={id} desc="Included" />)}
        {m && !(m.prefs?.on ?? []).length ? <Row last title="Lamina" desc="Included" /> : null}
      </Group>
      <Group title="API Keys">
        <Row last title={`${m?.keys?.length ?? 0} keys`} desc="Keys are encrypted on Lexari's server and never shown again. Replies on your key are billed by your provider and never use your Lexari balance." />
      </Group>
    </>
  );
}

const NOTIFS: [string, string, string][] = [
  ["replies", "Agent replies", "When an agent answers you and you're not looking."],
  ["groups", "Group mentions", "When someone names you or asks you in a group."],
  ["calls", "Missed calls", "When an agent tried to reach you."],
  ["wallet", "Wallet activity", "Money in or out of an agent's wallet."],
  ["cards", "Card purchases", "Every purchase an agent makes with its card."],
  ["digest", "Weekly email digest", "A short summary of what your team did."],
  ["product", "Product news", "New features and agents. Rarely."],
];
function Notifs() {
  const { me } = useData();
  const patch = usePatch();
  const n = ((me?.prefs as Record<string, unknown> | undefined)?.notif ?? {}) as Record<string, boolean>;
  const set = (key: string, v: boolean) => patch({ prefs: { notif: { ...n, [key]: v } } });
  return (
    <>
      <Group title="This device"><Row last title="Push notifications" desc="Get replies, calls and payment updates even when Lexari is closed."><Small label="Set up" onPress={() => router.push("/settings/notifications")} /></Row></Group>
      <Group title="Push and in-app">{NOTIFS.slice(0, 5).map(([key, t, d], i) => <Row key={key} last={i === 4} title={t} desc={d}><Toggle on={!!n[key]} set={(v) => set(key, v)} /></Row>)}</Group>
      <Group title="Email">{NOTIFS.slice(5).map(([key, t, d], i) => <Row key={key} last={i === 1} title={t} desc={d}><Toggle on={!!n[key]} set={(v) => set(key, v)} /></Row>)}</Group>
    </>
  );
}

function Data() {
  const { me } = useData();
  const patch = usePatch();
  const { token, signOut } = useSession();
  const p = (me?.prefs ?? {}) as Record<string, unknown>;
  return (
    <>
      <Group title="History">
        <Row title="Save chat history" desc="Keep your chats so you can come back to them."><Toggle on={p.history !== false} set={(v) => patch({ prefs: { history: v } })} /></Row>
        <Row last title="Help improve Lexari" desc="Share anonymous usage to make agents better. Off by default."><Toggle on={!!p.improve} set={(v) => patch({ prefs: { improve: v } })} /></Row>
      </Group>
      <Group title="Your data">
        <Row title="Export data" desc="Download your account, agents, chats, memories and hires as a JSON file."><Small icon="download" label="Export" onPress={() => Linking.openURL("https://app.lexari.ai/settings#data")} /></Row>
        <Row last title="Clear all chats" desc="Removes every message. Agents and memory stay."><Small label="Clear" onPress={() => token && api("/api/chats", { method: "DELETE" }, token).catch(() => {})} /></Row>
      </Group>
      <Group title="Danger zone">
        <Row last danger title="Delete account" desc="Permanently removes your account, agents, chats and memories from Lexari. Onchain records and your wallet stay yours."><Small icon="trash" label="Delete" onPress={() => Linking.openURL("https://app.lexari.ai/settings#data")} /></Row>
      </Group>
      {void signOut}
    </>
  );
}

function Security() {
  const k = useC();
  const { me } = useData();
  const { token, signOut } = useSession();
  const [sec, setSec] = useState<{ settings?: { phrase?: string; dailySendCapUsd?: number }; sessions?: { id: string; device: string; network?: string; current?: boolean; lastSeenAt?: number }[] } | null>(null);
  useEffect(() => { if (token) api<typeof sec>("/api/security", {}, token).then(setSec).catch(() => {}); }, [token]);
  const google = me?.user.method === "google";
  return (
    <>
      <Group title="Sign-in protection">
        <Row title={google ? "Google or email" : "Wallet signature"} desc={google ? "Privy checks your Google account or a one-time email code. Your Lexari wallet is created and kept by Privy." : "You sign a one-time message with your wallet. Lexari never sees your keys."} />
        <Row last title="Session" desc="Sessions last up to 30 days on a device. See every device below and sign out the ones you don't know." />
      </Group>
      <Group title="App lock"><View style={{ paddingVertical: 6 }}><SecurityRows /></View></Group>
      <Group title="Safety phrase"><Row last title={sec?.settings?.phrase ? `“${sec.settings.phrase}”` : "Not set"} desc={`Shows on every real Lexari confirm card. Daily send cap $${sec?.settings?.dailySendCapUsd ?? "—"}.`} /></Group>
      <Group title="Devices">
        {(sec?.sessions ?? []).slice(0, 6).map((s, i, a) => <Row key={s.id} last={i === a.length - 1} title={s.device} desc={`${s.current ? "This device · " : ""}${s.network ?? ""}`} />)}
      </Group>
      <Group title="This device"><Row last title="Sign out" desc="Ends this session."><Small icon="out" label="Sign out" onPress={() => signOut().then(() => router.replace("/(auth)/sign-in"))} /></Row></Group>
      {void k}
    </>
  );
}

function Accounts() {
  const { me } = useData();
  const k = useC();
  const google = me?.user.method === "google"; const addr = me?.user.wallet; const code = me?.user.referralCode;
  return (
    <>
      <Group title="Signed in with">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: k.line }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: k.ink, alignItems: "center", justifyContent: "center" }}><Icon name={google ? "google" : "wallet"} size={20} color={k.bg} /></View>
          <View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><T f="semi" s={15}>{google ? "Google or email" : "Solana wallet"}</T><View style={{ backgroundColor: GRAPE, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 }}><Label s={8} c="#fff">Signed in</Label></View></View><T s={13} c={k.ink45}>{google ? me?.user.email ?? "Privy account" : short(addr)}</T></View>
        </View>
        <Row last title={google ? "Lexari wallet" : "Wallet"} desc={addr ? `${short(addr)} signs your check-ins, quests, ID cards and hires.` : "Your wallet is still loading."}>{addr ? <Small icon="copy" label="Copy" onPress={() => Clipboard.setStringAsync(addr)} /> : null}</Row>
      </Group>
      {code ? <Group title="Invite friends"><Row last title={`Your code · ${code}`} desc="Friends who sign up with your link count toward your referral tiers in the Hub."><Small icon="copy" label="Copy link" onPress={() => Clipboard.setStringAsync(`https://app.lexari.ai/signin?ref=${code}`)} /></Row></Group> : null}
    </>
  );
}

function Social() {
  return (
    <>
      <Group title="Accounts">
        {["X", "Discord", "Telegram"].map((n, i) => <Row key={n} last={i === 2} title={n} desc={n === "Telegram" ? "Telegram linking opens once our Telegram sign-in is switched on." : "Not linked"}>{n !== "Telegram" ? <Small icon="link" label="Link" onPress={() => Linking.openURL("https://app.lexari.ai/settings#social")} /> : null}</Row>)}
      </Group>
      <Group><Row last title="Privacy" desc="Privy checks the account and Lexari keeps only its ID and username. Lexari never posts for you or reads your messages." /></Group>
    </>
  );
}

function Integrations() {
  const { token } = useSession();
  const [d, setD] = useState<{ locked?: boolean; added?: { id: string; name?: string }[] } | null>(null);
  useEffect(() => { if (token) api<typeof d>("/api/integrations", {}, token).then(setD).catch(() => setD({})); }, [token]);
  return (
    <>
      <Group title="Your agents' tools">
        {d?.locked ? <Row last title="Link a social account to unlock" desc="Integrations let your agents use real tools with their own wallets. Link X, Discord or Telegram first so every agent is tied to a real person."><Small icon="link" label="Link one to continue" onPress={() => Linking.openURL("https://app.lexari.ai/settings#social")} /></Row>
          : (d?.added ?? []).length ? (d!.added!).map((x, i, a) => <Row key={x.id} last={i === a.length - 1} title={x.name ?? x.id} />)
          : <Row last title="No integrations yet" desc="Add Solana, Orca or Polymarket and pick which agents can use them. Nothing runs until you add it." />}
      </Group>
      <Group><Row last title="Test funds only" desc="Trades and transfers run on Solana devnet with test funds only, and each one waits for your Confirm in chat. Market data is read only." /></Group>
    </>
  );
}

function Secrets() {
  const { token } = useSession();
  const [list, setList] = useState<{ id: string; label: string; service: string; last4: string }[] | null>(null);
  useEffect(() => { if (token) api<{ secrets: NonNullable<typeof list> }>("/api/secrets", {}, token).then((r) => setList(r.secrets)).catch(() => setList([])); }, [token]);
  return (
    <>
      <Group title="Your secrets">
        {(list ?? []).map((s, i, a) => <Row key={s.id} last={i === a.length - 1} title={s.label} desc={`${s.service} · ••••${s.last4}`} />)}
        {list && !list.length ? <Row last title="No secrets yet" desc="Paste a key in a secure secret card and it lands here, masked." /> : null}
      </Group>
      <Group><Row last title="Add a secret" desc="Keys are encrypted and never shown again."><Small icon="plus" label="Add" onPress={() => router.push("/settings/secrets")} /></Row></Group>
    </>
  );
}

function Billing() {
  const { me } = useData();
  const plan = me?.plan;
  return (
    <>
      <Group title="Plan"><Row last title={`${plan?.name ?? "Free"} plan`} desc={`${plan?.seats ?? 1} seat${plan?.seats === 1 ? "" : "s"}`}><Small label="Upgrade plan" onPress={() => router.push("/settings/billing")} /></Row></Group>
      <Group title="Hires"><Row last title="Specialists" desc="Specialists are a one-time $1 hire each, paid from your Lexari balance."><Small label="Wallet" onPress={() => router.navigate("/(tabs)/wallets")} /></Row></Group>
    </>
  );
}

function About() {
  const { signOut } = useSession();
  return (
    <>
      <Group><Row last title="Version" desc="Lexari Android"><T s={13} style={{ fontFamily: F.mono }}>1.0.0</T></Row></Group>
      <Group title="Legal">
        <Row title="Terms of use"><Small label="Read" onPress={() => Linking.openURL("https://lexari.ai/legal/terms")} /></Row>
        <Row last title="Privacy policy"><Small label="Read" onPress={() => Linking.openURL("https://lexari.ai/legal/privacy")} /></Row>
      </Group>
      <Group><Row last title="Sign out" desc="You can sign back in with Google or a wallet."><Small icon="out" label="Sign out" onPress={() => signOut().then(() => router.replace("/(auth)/sign-in"))} /></Row></Group>
    </>
  );
}

export default function Settings() {
  const k = useC();
  const [sec, setSec] = useState<Sec | null>(null);
  const cur = SECTIONS.find((x) => x.id === sec);
  const body: Record<Sec, ReactNode> = { general: <General />, personal: <Personal />, agents: <AgentsSec />, models: <Models />, notifications: <Notifs />, data: <Data />, security: <Security />, accounts: <Accounts />, social: <Social />, integrations: <Integrations />, secrets: <Secrets />, billing: <Billing />, about: <About /> };
  if (!cur) return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 18, paddingBottom: 32 }}>
      <T f="display" s={20.5} style={{ letterSpacing: -1.1 }}>Settings</T>
      <View style={{ marginTop: 14 }}>
        {SECTIONS.map((x) => (
          <Pressable key={x.id} onPress={() => setSec(x.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? k.tint : "transparent" })}>
            <Icon name={x.icon} size={18} color={k.ink75} /><T f="semi" s={15} c={k.ink75} style={{ flex: 1 }}>{x.label}</T><Icon name="right" size={16} color={k.ink45} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Pressable accessibilityLabel="All settings" onPress={() => setSec(null)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}><Icon name="back" size={19} color={k.ink} /></Pressable>
        <T f="display" s={21} style={{ letterSpacing: -0.9 }}>{cur.label}</T>
      </View>
      <View style={{ marginTop: -8 }}>{body[cur.id]}</View>
    </ScrollView>
  );
}
