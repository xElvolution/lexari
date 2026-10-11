import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowUp, ChevronLeft, Phone, ShieldAlert } from "lucide-react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Face, IconButton, Muted, friendly, tap } from "@/components/ui";
import { specialist } from "@/content/roster";
import { ConfirmCard } from "@/components/ConfirmCard";
import { useSession } from "@/state/session";
import { usePrefs } from "@/state/prefs";
import { msgId, streamChat, type ChatEvent } from "@/lib/api";
import { findSecrets, isBlockedKind, scanSecrets } from "@/lib/secretScan";
import { grape } from "@/theme/colors";

type Line = {
  id: string;
  from: "me" | "agent";
  text: string;
  confirm?: { title: string; amount: string; to: string };
  secretId?: string;
};

function asConfirm(send: Record<string, unknown> | undefined) {
  if (!send) return undefined;
  const amount = String(send.amount ?? send.usd ?? send.title ?? "Payment");
  const to = String(send.to ?? send.recipient ?? "Lexari treasury");
  const title = String(send.title ?? "Confirm");
  return { title, amount, to };
}

const PROMPTS: Record<string, string> = {
  build: "Build me a one-page site for my coffee shop",
  trade: "Watch SOL and tell me if it moves 5% today",
  send: "Send 5 USDC to ",
};
const IDEAS = ["Plan my week", "Summarize today's crypto news", "Draft a reply to my landlord"];

export default function Chat() {
  const { slug = "home", prompt } = useLocalSearchParams<{ slug: string; prompt?: string }>();
  const { token } = useSession();
  const { palette } = usePrefs();
  const insets = useSafeAreaInsets();
  const s = specialist(slug);
  const name = s?.name || (slug === "home" ? "Your agent" : slug);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState(prompt ? PROMPTS[prompt] || "" : "");
  const [mood, setMood] = useState<"idle" | "thinking" | "speaking" | "happy">("idle");
  const [err, setErr] = useState("");
  const scroll = useRef<ScrollView>(null);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [lines]);

  const send = async (raw?: string) => {
    const body = (raw ?? text).trim();
    if (!token || !body) return;
    const found = await findSecrets(body);
    if (found.some((f) => isBlockedKind(f.kind))) { setErr("Seed phrases and private keys are never sent. Keep them to yourself."); return; }
    const key = found.find((f) => f.kind === "key");
    if (key) { setErr(`That looks like ${key.label}. Save it in Secrets instead.`); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const mine: Line = { id: msgId(), from: "me", text: body };
    const replyId = msgId();
    setLines((xs) => [...xs, mine, { id: replyId, from: "agent", text: "" }]);
    setText(""); setMood("thinking"); setErr("");
    try {
      await streamChat({ convo: slug, text: mine.text, speaker: slug, history: [], recall: [], userMsgId: mine.id, replyMsgId: replyId, meta: {}, tz: "UTC" }, token, (ev: ChatEvent) => {
        if (ev.token) { setMood("speaking"); setLines((xs) => xs.map((l) => l.id === replyId ? { ...l, text: l.text + (ev.token || "") } : l)); }
        if (ev.replace) setLines((xs) => xs.map((l) => l.id === replyId ? { ...l, text: ev.replace || "" } : l));
        if (ev.send) setLines((xs) => xs.map((l) => l.id === replyId ? { ...l, confirm: asConfirm(ev.send) } : l));
        if (ev.secret?.id) setLines((xs) => xs.map((l) => l.id === replyId ? { ...l, secretId: ev.secret?.id } : l));
        if (ev.error) { console.warn("[lexari] chat", ev.error); setErr("Your agent hit a snag. Try again."); }
        if (ev.done) { setMood("happy"); setTimeout(() => setMood("idle"), 1800); }
      });
    } catch (e) {
      setMood("idle");
      setLines((xs) => xs.filter((l) => l.id !== replyId || l.text));
      setErr(friendly(e, "That message didn't send. Try again."));
    }
  };

  const status = mood === "thinking" ? "Thinking…" : mood === "speaking" ? "Typing…" : "Online";
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 0.5, borderBottomColor: palette.line }}>
        <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/hub"))}><ChevronLeft color={palette.ink} size={20} /></IconButton>
        <Face slug={s ? slug : undefined} size={40} mood={mood} animated />
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.ink, fontSize: 15.5, fontWeight: "700" }}>{name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: mood === "idle" || mood === "happy" ? "#34d399" : "#a58bff" }} />
            <Muted>{status}</Muted>
          </View>
        </View>
        <IconButton label="Call" onPress={() => router.push(`/call/${slug}`)}><Phone color={palette.ink} size={16} /></IconButton>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {lines.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
            <Face slug={s ? slug : undefined} size={112} mood="happy" animated />
            <Text style={{ color: palette.ink, fontSize: 20, fontWeight: "700", letterSpacing: -0.5, marginTop: 14 }}>Hi, I'm {name === "Your agent" ? "your agent" : name}</Text>
            <Muted style={{ textAlign: "center", marginTop: 6, maxWidth: 280, fontSize: 13 }}>{s?.quip || "Tell me what you need. I can research, write, plan, build and pay, with your OK."}</Muted>
            <View style={{ gap: 8, marginTop: 20, alignSelf: "stretch" }}>
              {IDEAS.map((i) => (
                <Pressable key={i} onPress={() => { tap(); send(i); }} style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ color: palette.ink, fontSize: 13.5 }}>{i}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {lines.map((l) => (
          <View key={l.id} style={{ marginBottom: 12, flexDirection: "row", gap: 8, justifyContent: l.from === "me" ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
            {l.from === "agent" ? <Face slug={s ? slug : undefined} size={26} /> : null}
            <View style={{ maxWidth: "80%" }}>
              <View style={{ backgroundColor: l.from === "me" ? "#5b2bff" : palette.card, borderRadius: 18, borderBottomRightRadius: l.from === "me" ? 6 : 18, borderBottomLeftRadius: l.from === "me" ? 18 : 6, paddingHorizontal: 13, paddingVertical: 9, borderWidth: l.from === "me" ? 0 : 0.5, borderColor: palette.line }}>
                {l.text ? <Text style={{ color: l.from === "me" ? "#fff" : palette.ink, fontSize: 14, lineHeight: 20 }}>{l.text}</Text> : <TypingDots />}
              </View>
              {l.confirm ? <ConfirmCard title={l.confirm.title} amount={l.confirm.amount} to={l.confirm.to} onReview={() => router.push({ pathname: "/confirm/[id]", params: { id: l.id, payload: JSON.stringify(l.confirm) } })} /> : null}
              {l.secretId ? <Pressable onPress={() => router.push(`/settings/secrets?request=${l.secretId}`)} style={{ marginTop: 6 }}><Text style={{ color: palette.brand, fontSize: 13, fontWeight: "600" }}>Save a key securely</Text></Pressable> : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {err ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: palette.tint }}><ShieldAlert color="#ffb4c0" size={15} /><Text style={{ color: palette.ink, fontSize: 12, flex: 1 }}>{err}</Text></View> : null}
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8, paddingBottom: insets.bottom + 10, borderTopWidth: 0.5, borderTopColor: palette.line }}>
        <TextInput
          value={text}
          multiline
          onChangeText={(v) => { setText(v); if (scanSecrets(v).some((f) => isBlockedKind(f.kind))) setErr("That text contains a seed phrase or private key. It won't be sent."); }}
          placeholder={`Message ${name === "Your agent" ? "your agent" : name}`}
          placeholderTextColor={palette.muted}
          style={{ flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, backgroundColor: palette.card, borderWidth: 0.5, borderColor: palette.line, color: palette.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 14.5 }}
        />
        <Pressable accessibilityLabel="Send" disabled={!text.trim()} onPress={() => send()} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? grape : palette.tint, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}>
          <ArrowUp color={text.trim() ? "#fff" : palette.muted} size={20} strokeWidth={2.6} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function TypingDots() {
  const { palette } = usePrefs();
  return <View style={{ flexDirection: "row", gap: 4, paddingVertical: 6 }}>{[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.muted, opacity: 0.4 + i * 0.25 }} />)}</View>;
}
