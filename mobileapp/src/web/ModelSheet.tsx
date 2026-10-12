/** Port of webapp/components/billing/ModelSheet.tsx: pick the model for this chat or for the agent everywhere. Live /api/billing. */
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import Icon from "@/components/Icon";
import { api } from "@/lib/api";
import { useSession } from "@/state/session";
import { GRAPE, Label, T, WSheet, useC } from "@/web/kit";

type M = { id: string; label: string; maker: string; blurb: string; pool: "lamina" | "premium"; price: { in: number; out: number } };
const LAMINA: M = { id: "lamina", label: "Lamina", maker: "Lexari", blurb: "Lexari's own model. Fast, tuned for your agents.", pool: "lamina", price: { in: 0.45, out: 2.25 } };
const INCLUDED: M[] = [
  { id: "grok-fast", label: "Grok 4.7 Fast", maker: "xAI", blurb: "Quickest replies for everyday chat.", pool: "lamina", price: { in: 0.45, out: 2.25 } },
  { id: "grok-4.6", label: "Grok 4.6", maker: "xAI", blurb: "The previous Grok. Steady and thorough.", pool: "lamina", price: { in: 0.45, out: 2.25 } },
];
/** content/models.ts HOUSE: open models on Lexari's provider keys. Unavailable when the server has no key for them. */
const HOUSE: M[] = [
  { id: "kimi", label: "Kimi", maker: "Moonshot AI", blurb: "Moonshot's flagship. Long context, strong at planning and tools.", pool: "lamina", price: { in: 0.6, out: 2.5 } },
  { id: "qwen", label: "Qwen 3.8 Max", maker: "Alibaba", blurb: "Alibaba's strongest Qwen. Careful multi-step reasoning.", pool: "lamina", price: { in: 1.2, out: 6 } },
  { id: "zg", label: "0G Compute", maker: "0G", blurb: "Open models on 0G's decentralized network, with automatic failover.", pool: "lamina", price: { in: 0.5, out: 1.6 } },
];
const LETTER: Record<string, [string, string]> = { "Moonshot AI": ["K", "#16191e"], Alibaba: ["Q", "#615ced"], "0G": ["0G", "#b75fff"] };
const PREMIUM: M[] = [
  { id: "claude-sonnet", label: "Claude Sonnet 5.5", maker: "Anthropic", blurb: "Careful writing and reasoning. The everyday premium pick.", pool: "premium", price: { in: 2, out: 10 } },
  { id: "claude-opus", label: "Claude Opus 5.5", maker: "Anthropic", blurb: "Anthropic's strongest model for hard, long tasks.", pool: "premium", price: { in: 4, out: 20 } },
  { id: "grok", label: "Grok 4.7", maker: "xAI", blurb: "Quick, direct and current. Strong on live topics.", pool: "premium", price: { in: 2, out: 6 } },
  { id: "gemini-flash", label: "Gemini 3.8 Flash", maker: "Google", blurb: "Fast and light on usage, with a huge context window.", pool: "premium", price: { in: 0.75, out: 3.75 } },
];
const turn = (p: M["price"]) => 3000 * p.in + 400 * p.out;
const burn = (m: M) => { const x = turn(m.price) / turn(PREMIUM[0].price); return x >= 1 ? Math.round(x) : Math.round(x * 10) / 10; };
const LOGO: Record<string, number> = { Anthropic: require("../../assets/models/claude.png"), xAI: require("../../assets/models/xai.png"), Google: require("../../assets/models/gemini.png") };

type Billing = { plan: { id: string }; usage: { lamina: { used: number; limit: number }; free?: { resetsAt: number } }; credits: { balance: number; spent: number }; models: { gateway: boolean; available: Record<string, boolean>; agents: Record<string, string | null>; chats: Record<string, string>; default: string; keys: unknown[]; prefs: { off: string[] } } };

export function LaminaMark({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 3.5 20.5 8 12 12.5 3.5 8z" fill={color} /><Path d="m3.5 12 8.5 4.5 8.5-4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} /><Path d="m3.5 16 8.5 4.5 8.5-4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} /></Svg>;
}
const TILE: Record<string, { bg: string; tint?: string }> = { xAI: { bg: "#0a0a0a", tint: "#fff" }, Anthropic: { bg: "#d97757", tint: "#fff" }, Google: { bg: "#fff" } };
function Mark({ m, size = 40 }: { m: M; size?: number }) {
  if (m.id === "lamina") return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center" }}><LaminaMark size={size * 0.5} /></View>;
  const letter = LETTER[m.maker];
  if (letter) return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: letter[1], alignItems: "center", justifyContent: "center" }}><T f="xbold" s={Math.round(size * (letter[0].length > 1 ? 0.34 : 0.42))} c="#fff">{letter[0]}</T></View>;
  const st = TILE[m.maker] ?? TILE.xAI;
  return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: st.bg, overflow: "hidden", alignItems: "center", justifyContent: "center" }}><Image source={LOGO[m.maker]} resizeMode="contain" style={{ width: size * 0.6, height: size * 0.6, tintColor: st.tint }} /></View>;
}

export function ModelSheet({ open, onClose, convo, agent, agentName, group, onChange }: { open: boolean; onClose: () => void; convo: string; agent: string | null; agentName: string; group: boolean; onChange: (id: string) => void }) {
  const k = useC();
  const { token } = useSession();
  const [s, setS] = useState<Billing | null>(null);
  const [scope, setScope] = useState<"chat" | "agent">("agent");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (open && token) api<Billing>("/api/billing", {}, token).then((b) => { setS(b); setScope(group || !agent ? "chat" : b.models.chats[convo] ? "chat" : "agent"); }).catch(() => {}); }, [open, token]);
  const cur = s ? (s.models.chats[convo] || (agent && s.models.agents[agent]) || s.models.default || "lamina") : "lamina";
  const selected = s && scope === "agent" && agent ? (s.models.agents[agent] || s.models.default || "lamina") : cur;
  const pick = async (m: M) => {
    if (!s || !s.models.available[m.id]) return;
    setBusy(m.id);
    try {
      if (scope === "agent" && agent) {
        await api("/api/billing/model", { method: "PUT", body: JSON.stringify({ scope: "agent", agent, model: m.id }) }, token);
        if (s.models.chats[convo] && !group) await api("/api/billing/model", { method: "PUT", body: JSON.stringify({ scope: "chat", convo, model: null }) }, token);
      } else await api("/api/billing/model", { method: "PUT", body: JSON.stringify({ scope: "chat", convo, model: m.id }) }, token);
      onChange(m.id); onClose();
    } catch { /* stays open */ } finally { setBusy(null); }
  };
  const Row = ({ m, note }: { m: M; note?: string }) => {
    const on = selected === m.id; const soon = !s?.models.available[m.id]; const lam = m.id === "lamina"; const house = HOUSE.some((h) => h.id === m.id);
    return (
      <Pressable disabled={soon || !!busy} onPress={() => void pick(m)} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 18, backgroundColor: on ? GRAPE : k.card, borderWidth: on ? 1 : lam ? 2 : 1, borderColor: on ? GRAPE : lam ? "rgba(91,43,255,0.4)" : k.line, opacity: soon ? 0.55 : 1 }}>
        <Mark m={m} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <T f="bold" s={14} c={on ? "#fff" : k.ink} lines={1} style={{ flexShrink: 1 }}>{m.label}</T>
            <View style={{ borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: on ? "rgba(255,255,255,0.2)" : m.pool === "lamina" ? "rgba(91,43,255,0.12)" : k.tint }}><Label s={8} c={on ? "#fff" : m.pool === "lamina" ? k.brandInk : k.ink60}>{m.pool === "lamina" ? "Included" : `${burn(m)}x`}</Label></View>
          </View>
          <T s={12} c={on ? "rgba(255,255,255,0.8)" : k.ink60} style={{ marginTop: 2, lineHeight: 16 }}>{note ?? m.blurb}</T>
        </View>
        {busy === m.id ? <ActivityIndicator color={on ? "#fff" : GRAPE} /> : on ? <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} stroke={3} color={k.brandInk} /></View>
          : soon ? <View style={{ borderRadius: 999, backgroundColor: k.tint, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={8.5} c={k.ink60}>{house ? "Unavailable" : "Soon"}</Label></View>
          : <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: k.line }} />}
      </Pressable>
    );
  };
  const u = s?.usage; const pct = u ? Math.min(100, Math.round((u.lamina.used / Math.max(1, u.lamina.limit)) * 100)) : 0;
  const money = (micros: number) => `$${(micros / 1e6).toFixed(2)}`;
  const time = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <WSheet open={open} onClose={onClose} title="Model" iconNode={<View style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center" }}><LaminaMark /></View>}
      sub={group ? "Who answers in this group. Everyone in it uses this model." : scope === "agent" ? `${agentName} uses this in every chat that has no model of its own.` : "Only this chat. Other chats keep their model."}
      footer={s ? (
        <View style={{ gap: 12 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><LaminaMark size={15} color={k.brandInk} /><T f="bold" s={14} style={{ flex: 1 }}>{u?.free ? "Lamina today" : "Lamina"}</T><T f="bold" s={14}>{`${pct}%`}</T></View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: k.tint, marginTop: 8, overflow: "hidden" }}><View style={{ height: 8, width: `${pct}%`, backgroundColor: GRAPE }} /></View>
            {u?.free ? <T s={12} c={k.ink60} style={{ marginTop: 6 }}>{`Refills at ${time(u.free.resetsAt)}.`}</T> : null}
          </View>
          {s.credits.balance > 0 ? <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><T f="semi" s={14}>Extra credits</T><T f="bold" s={14}>{money(s.credits.balance)}{s.credits.spent > 0 ? <T f="semi" s={14} c={k.ink45}>{`  ${money(s.credits.spent)} used this month`}</T> : null}</T></View> : null}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => { onClose(); router.push("/(tabs)/settings"); }}><T f="bold" s={13} c={k.brandInk}>Usage and billing</T></Pressable>
            <Pressable onPress={() => { onClose(); router.push(s.plan.id === "free" ? "/settings/billing" : { pathname: "/(tabs)/wallets", params: { topup: "1" } }); }} style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: k.tint, justifyContent: "center" }}><T f="bold" s={13}>{s.plan.id === "free" ? "Upgrade" : "Top up"}</T></Pressable>
          </View>
        </View>
      ) : undefined}>
      {!group && agent ? (
        <View style={{ flexDirection: "row", borderRadius: 999, backgroundColor: k.tint, padding: 4, marginBottom: 12 }}>
          {([["chat", "This chat"], ["agent", `${agentName} everywhere`]] as const).map(([id, l]) => (
            <Pressable key={id} onPress={() => setScope(id)} style={{ flex: 1, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: scope === id ? k.card : "transparent" }}><T f="bold" s={13} c={scope === id ? k.ink : k.ink60} lines={1}>{l}</T></Pressable>
          ))}
        </View>
      ) : null}
      {!s ? <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={GRAPE} /></View> : (
        <View style={{ gap: 8 }}>
          <Row m={LAMINA} />
          {INCLUDED.filter((m) => s.models.available[m.id] && !s.models.prefs.off.includes(m.id)).map((m) => <Row key={m.id} m={m} />)}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 12 }}><Label s={9.5} c={k.ink45}>Open models</Label><T s={11.5} c={k.ink45}>Included · falls back if busy</T></View>
          {HOUSE.filter((m) => !s.models.available[m.id] || !s.models.prefs.off.includes(m.id)).map((m) => <Row key={m.id} m={m} />)}
          <Pressable onPress={() => { onClose(); router.push("/(tabs)/settings"); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, marginTop: 4 }}><Icon name="key" size={13} color={k.brandInk} /><T f="bold" s={12.5} c={k.brandInk}>{s.models.keys.length ? "Manage models and API keys" : "Use your own API keys"}</T></Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 12 }}><Label s={9.5} c={k.ink45}>Premium</Label><T s={11.5} c={k.ink45}>Uses premium usage at API price + 20%</T></View>
          {!s.models.gateway ? (
            <View style={{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 18, backgroundColor: "rgba(91,43,255,0.08)", borderWidth: 1, borderColor: "rgba(91,43,255,0.25)" }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(91,43,255,0.15)", alignItems: "center", justifyContent: "center" }}><Icon name="spark" size={17} color={k.brandInk} /></View>
              <View style={{ flex: 1 }}><T f="bold" s={14}>Premium models are coming soon</T><T s={12.5} c={k.ink60} style={{ marginTop: 2, lineHeight: 17 }}>Claude, Grok and Gemini switch on here shortly. Lamina is ready for every agent right now.</T></View>
            </View>
          ) : null}
          {PREMIUM.map((m) => <Row key={m.id} m={m} />)}
        </View>
      )}
    </WSheet>
  );
}
