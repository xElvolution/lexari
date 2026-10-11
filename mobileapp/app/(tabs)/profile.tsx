/** Port of webapp/app/(app)/profile/page.tsx at phone width: cover + picture, Edit profile / Sign out, name with plan badge, stats, Account / Security / Preferences tabs. */
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { SecurityRows } from "@/components/SecurityRows";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { AgentTile, F, GRAPE, Grad, Label, Pill, T, WSheet, short, useC } from "@/web/kit";
import { useData, youName } from "@/web/data";

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const k = useC();
  return <View style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 14 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><T f="bold" s={16}>{title}</T>{right}</View>{children}</View>;
}
function Rows({ rows }: { rows: [string, string, string][] }) {
  const k = useC();
  return (
    <View style={{ marginTop: 6 }}>
      {rows.map(([ic, l, v], i) => (
        <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: k.line }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={16} color={k.ink60} /></View>
          <T s={14} c={k.ink60} style={{ flex: 1 }}>{l}</T>
          <T f="bold" s={14} style={l === "Wallet" || l === "Invite code" || l === "User ID" ? { fontFamily: F.monoB, fontSize: 13 } : undefined}>{v}</T>
        </View>
      ))}
    </View>
  );
}
function PillLink({ label, icon, onPress }: { label: string; icon?: string; onPress: () => void }) {
  const k = useC();
  return <Pressable onPress={onPress} style={{ height: 38, borderRadius: 19, backgroundColor: k.tint, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>{icon ? <Icon name={icon} size={14} color={k.ink} /> : null}<T f="bold" s={13.5}>{label}</T></Pressable>;
}

export default function Profile() {
  const k = useC();
  const { me, reload } = useData();
  const { token, signOut } = useSession();
  const { theme, setTheme } = usePrefs() as ReturnType<typeof usePrefs> & { theme?: string };
  const [tab, setTab] = useState<"account" | "security" | "prefs">("account");
  const [edit, setEdit] = useState(false);
  const p = me?.profile ?? {};
  const name = youName(me);
  const plan = me?.plan ?? { id: "free", name: "Free", seats: 1 };
  const team = me?.agents ?? [];
  const groups = (me?.chats ?? []).filter((c) => c.kind === "group").length;
  const since = me?.user.createdAt ? new Date(me.user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const out = () => signOut().then(() => router.replace("/(auth)/sign-in"));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 32, gap: 16 }}>
      <View style={{ borderRadius: 26, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, overflow: "hidden" }}>
        <View style={{ height: 112 }}>
          <Grad angle={120} stops={[["#3514b0", 0], ["#5b2bff", 0.6], ["#8f6bff", 1]]} />
          <Pressable accessibilityLabel="Add a cover photo" style={{ position: "absolute", right: 12, bottom: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" }}><Icon name="camera" size={15} color="#fff" /></Pressable>
        </View>
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <View style={{ marginTop: -46, width: 92, height: 92, borderRadius: 46, backgroundColor: k.ink, borderWidth: 5, borderColor: k.card, alignItems: "center", justifyContent: "center" }}>
            <T f="bold" s={20} c={k.bg}>{youName(me).split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "Y"}</T>
            <View style={{ position: "absolute", right: -4, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: GRAPE, borderWidth: 2, borderColor: k.card, alignItems: "center", justifyContent: "center" }}><Icon name="camera" size={12} color="#fff" /></View>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pill kind="ghost" icon="edit" label="Edit profile" h={42} style={{ flex: 1 }} onPress={() => setEdit(true)} />
            <Pill kind="outline" icon="out" label="Sign out" h={42} style={{ flex: 1 }} onPress={out} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
            <T f="display" s={28} style={{ letterSpacing: -1.2 }}>{name}</T>
            <View style={{ backgroundColor: GRAPE, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Label s={9} c="#fff">{plan.name}</Label></View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6 }}>
            {p.username ? <T f="semi" s={15} c={k.ink45}>{`@${p.username}`}</T> : <Pressable onPress={() => setEdit(true)}><T f="semi" s={14} c={k.brandInk}>Add a username</T></Pressable>}
            <Pressable onPress={() => router.navigate("/(tabs)/settings")} style={{ height: 32, borderRadius: 16, backgroundColor: k.tint, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 }}><Icon name="link" size={14} color={k.ink75} /><T f="semi" s={13} c={k.ink75}>Link X, Discord or Telegram</T></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 22, marginTop: 14 }}>
            {[[team.length, "agents"], [groups, "groups"], [me?.memories?.length ?? 0, "memories"]].map(([n, l]) => <T key={String(l)} s={14} c={k.ink60}><T f="bold" s={14}>{String(n)}</T>{` ${l}`}</T>)}
          </View>
        </View>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: k.line }}>
          {([["account", "Account"], ["security", "Security"], ["prefs", "Preferences"]] as const).map(([id, l]) => (
            <Pressable key={id} onPress={() => setTab(id)} style={{ flex: 1, paddingVertical: 14, alignItems: "center" }}>
              <T f="bold" s={14.5} c={tab === id ? k.ink : k.ink45}>{l}</T>
              {tab === id ? <View style={{ position: "absolute", left: 16, right: 16, bottom: 0, height: 3, borderRadius: 2, backgroundColor: GRAPE }} /> : null}
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "account" ? (
        <>
          <Card title="Account">
            <Rows rows={[
              ...(me?.user.email ? [["google", "Email", me.user.email] as [string, string, string]] : []),
              ["wallet", "Wallet", me?.user.wallet ? short(me.user.wallet) : "Loading"],
              ["star", "Plan", `${plan.name} · ${plan.seats} seat${plan.seats === 1 ? "" : "s"}`],
              ...(me?.user.referralCode ? [["star", "Invite code", me.user.referralCode] as [string, string, string]] : []),
              ["spark", "Member since", since],
            ]} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}><PillLink label="Plan and billing" onPress={() => router.push("/settings/billing")} /><PillLink label="Wallet" onPress={() => router.navigate("/(tabs)/wallets")} /></View>
          </Card>
          <Card title="Your agents" right={<Pressable onPress={() => router.navigate("/(tabs)/team")}><T f="bold" s={13.5} c={k.brandInk}>Team</T></Pressable>}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {team.map((t) => <Pressable key={t.slug} onPress={() => router.push(`/agents/${t.slug}`)} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: k.tint, paddingVertical: 4, paddingLeft: 4, paddingRight: 14 }}><AgentTile slug={t.slug} look={t.look} size={30} dot={false} /><T f="semi" s={13.5}>{t.name}</T></Pressable>)}
            </View>
          </Card>
        </>
      ) : tab === "security" ? (
        <>
          <Card title="Sign-in"><Rows rows={[["user", "Signed in with", me?.user.method === "google" ? "Google or email" : "Solana wallet"], ...(me?.user.email ? [["google", "Email", me.user.email] as [string, string, string]] : []), ["wallet", "Wallet", me?.user.wallet ? short(me.user.wallet) : "Loading"]]} /></Card>
          <Card title="App lock"><View style={{ marginTop: 6 }}><SecurityRows /></View></Card>
          <Card title="Session">
            <T s={14} c={k.ink60} style={{ marginTop: 4 }}>Signing out keeps your agents, chats and Brain saved for next time.</T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}><PillLink icon="out" label="Sign out" onPress={out} /><PillLink label="Privacy and data" onPress={() => router.navigate("/(tabs)/settings")} /></View>
          </Card>
        </>
      ) : (
        <>
          <Card title="Look">
            <View style={{ flexDirection: "row", alignSelf: "flex-start", backgroundColor: k.tint, borderRadius: 999, padding: 4, marginTop: 12 }}>
              {([["light", "Light", "sun"], ["dark", "Dark", "moon"], ["system", "Device", "laptop"]] as const).map(([id, l, ic]) => { const on = (theme ?? "dark") === id; return <Pressable key={id} onPress={() => setTheme(id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? k.card : "transparent" }}><Icon name={ic} size={14} color={on ? k.ink : k.ink60} /><T f="bold" s={13.5} c={on ? k.ink : k.ink60}>{l}</T></Pressable>; })}
            </View>
            <Rows rows={[["globe", "Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone || "Not set"]]} />
          </Card>
          <Card title="Voices">
            <T s={14} c={k.ink60} style={{ marginTop: 4 }}>Each agent has its own voice on calls and when reading messages aloud.</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{team.slice(0, 6).map((t) => <PillLink key={t.slug} icon="speaker" label={t.name} onPress={() => router.push(`/agents/${t.slug}`)} />)}</View>
          </Card>
          <Card title="More settings">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}><PillLink label="Notifications" onPress={() => router.navigate("/(tabs)/settings")} /><PillLink label="All settings" onPress={() => router.navigate("/(tabs)/settings")} /><PillLink label={`${team.find((a) => a.slug === "home")?.name ?? "Your agent"}'s Brain`} onPress={() => router.navigate("/(tabs)/brain")} /></View>
          </Card>
        </>
      )}
      <EditSheet open={edit} onClose={() => setEdit(false)} initial={{ name: p.name ?? name, username: p.username ?? "", bio: (p as { bio?: string }).bio ?? "" }} onSave={async (v) => { if (token) await api("/api/me", { method: "PATCH", body: JSON.stringify({ profile: v }) }, token).catch(() => {}); await reload(); setEdit(false); }} />
    </ScrollView>
  );
}

function EditSheet({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: { name: string; username: string; bio: string }; onSave: (v: { name: string; username: string; bio: string }) => void }) {
  const k = useC();
  const [v, setV] = useState(initial);
  const ok = !v.username || /^[A-Za-z0-9_]{3,20}$/.test(v.username);
  const field = { marginTop: 6, height: 46, borderRadius: 14, backgroundColor: k.tint, paddingHorizontal: 14, color: k.ink, fontFamily: F.semi, fontSize: 15 } as const;
  return (
    <WSheet open={open} title="Edit profile" onClose={onClose}>
      <T s={13} c={k.ink60}>Tap your picture or cover on your profile to change it.</T>
      <Label s={9.5} c={k.ink60} style={{ marginTop: 14 }}>Display name</Label>
      <TextInput value={v.name} onChangeText={(name) => setV({ ...v, name: name.slice(0, 60) })} style={field} />
      <Label s={9.5} c={k.ink60} style={{ marginTop: 14 }}>Username</Label>
      <TextInput value={v.username} autoCapitalize="none" onChangeText={(username) => setV({ ...v, username: username.slice(0, 20) })} style={field} />
      <T s={12} c={ok ? k.ink45 : "#e5484d"} style={{ marginTop: 4 }}>3 to 20 letters, numbers or underscores.</T>
      <TextInput value={v.bio} multiline onChangeText={(bio) => setV({ ...v, bio: bio.slice(0, 300) })} placeholder="A line about you" placeholderTextColor={k.ink45} style={{ ...field, height: 90, paddingTop: 12, textAlignVertical: "top", marginTop: 14 }} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Pill kind="ghost" label="Cancel" h={44} style={{ flex: 1 }} onPress={onClose} />
        <Pill label="Save" h={44} style={{ flex: 1 }} disabled={!ok || !v.name.trim()} onPress={() => onSave(v)} />
      </View>
    </WSheet>
  );
}
