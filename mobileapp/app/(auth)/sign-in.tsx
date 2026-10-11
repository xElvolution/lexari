/**
 * Port of webapp/app/signin + webapp/components/SignInPage.tsx at phone size (webapp/app/mobile-compact.css).
 * The grape hero carries the hanging landing badge (shared/components/Badge.tsx), then "Welcome in." with
 * Google or email (Privy) and the Solana wallets (Mobile Wallet Adapter on Android, like the web on a phone).
 */
import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { PRIVACY, TERMS, type Block, type Doc } from "@/content/legal";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { usePlatformMethods } from "@/lib/privyMethods";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { Face, Sheet, T, tap } from "@/components/ui";
import Icon from "@/components/Icon";
import Badge, { Carpet, badgeCopy } from "@/components/Badge";
import SignInLoader from "@/components/SignInLoader";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { env } from "@/lib/env";
import { nonceFor, signInWithServer } from "@/lib/authFlow";
import { setUserAgent } from "@/lib/api";
import { nextAfterSignIn } from "@/lib/route";
import { KEY_MESSAGE, rememberKeys } from "@/lib/vault";
import type { SavedSession } from "@/lib/session";
import { isSolanaMobile, userAgent } from "@/lib/device";
import { Btn, F, GRAPE, PopIn, Rise, useC } from "@/web/kit";

const SOON = "This sign-in option is being switched on. Please try another way for now.";

function said(error: unknown, fallback: string) {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) return "Couldn't reach Lexari. The sign-in server did not answer.";
  return error instanceof Error && error.message.length < 120 ? error.message : fallback;
}

function LegalBlock({ block }: { block: Block }) {
  if ("p" in block) return <Text style={[T.body, { color: "rgba(255,255,255,0.78)", lineHeight: 22 }]}>{block.p}</Text>;
  if ("list" in block) return <View style={{ gap: 6 }}>{block.list.map((item) => <Text key={item} style={[T.body, { color: "rgba(255,255,255,0.78)", lineHeight: 22 }]}>• {item}</Text>)}</View>;
  return <View style={{ gap: 8 }}>{block.rows.map((row) => <Text key={row.name} style={[T.small, { color: "rgba(255,255,255,0.78)", lineHeight: 18 }]}><Text style={{ fontWeight: "700" }}>{row.name}. </Text>{row.role} {row.data}</Text>)}</View>;
}

function LegalDoc({ doc, maxHeight }: { doc: Doc; maxHeight: number }) {
  return (
    <ScrollView style={{ maxHeight }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
      <Text style={[T.small, { color: "rgba(255,255,255,0.5)" }]}>{doc.intro}</Text>
      {doc.summary.map((line) => <Text key={line} style={[T.body, { color: "rgba(255,255,255,0.78)", lineHeight: 22 }]}>• {line}</Text>)}
      {doc.sections.map((section) => (
        <View key={section.id} style={{ gap: 8 }}>
          <Text style={[T.h2, { color: "#fff", marginTop: 8 }]}>{section.title}</Text>
          {section.body.map((block, i) => <LegalBlock key={i} block={block} />)}
        </View>
      ))}
    </ScrollView>
  );
}

function CodeBoxes({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const refs = useRef<Array<TextInput | null>>([]);
  const { width } = useWindowDimensions();
  const inner = Math.min(width - 44, 420) - 40;
  const gap = inner < 280 ? 6 : 8;
  const box = Math.min(48, Math.floor((inner - gap * 5) / 6));
  const digits = value.replace(/\D/g, "").slice(0, 6);
  const write = (start: number, text: string) => {
    const incoming = text.replace(/\D/g, "");
    if (!incoming) {
      onChange(digits.slice(0, start) + digits.slice(start + 1));
      return;
    }
    if (incoming.length === 1) {
      onChange((digits.slice(0, start) + incoming + digits.slice(start + 1)).slice(0, 6));
      if (start < 5) refs.current[start + 1]?.focus();
      return;
    }
    const next = (digits.slice(0, start) + incoming).slice(0, 6);
    onChange(next);
    refs.current[Math.min(next.length, 5)]?.focus();
  };
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap }}>
      {Array.from({ length: 6 }, (_, i) => (
        <TextInput
          key={i}
          ref={(node) => { refs.current[i] = node; }}
          accessibilityLabel={`Digit ${i + 1} of 6`}
          value={digits[i] ?? ""}
          onChangeText={(text) => write(i, text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === "Backspace" && !digits[i] && i > 0) {
              onChange(digits.slice(0, i - 1) + digits.slice(i));
              refs.current[i - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={6}
          autoFocus={i === 0}
          selectTextOnFocus
          textContentType={i === 0 ? "oneTimeCode" : "none"}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          style={{ width: box, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: digits.length === i ? "#5b2bff" : "rgba(255,255,255,0.16)", backgroundColor: "#0b0915", color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" }}
        />
      ))}
    </View>
  );
}

type Methods = { google: () => Promise<void>; sendCode: (email: string) => Promise<void>; verify: (email: string, code: string) => Promise<void> };

const offline: Methods = {
  google: async () => { console.warn("[lexari] Google sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  sendCode: async () => { console.warn("[lexari] Email sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  verify: async () => { throw new Error(SOON); },
};

function WithPrivy(p: { onSession: (s: SavedSession) => Promise<void>; name: string; setName: (v: string) => void }) {
  return <SignInView methods={usePlatformMethods(p.onSession)} onSession={p.onSession} name={p.name} setName={p.setName} />;
}


const WALLETS = [
  { id: "phantom", name: "Phantom", img: require("../../assets/wallets/phantom.png") },
  { id: "solflare", name: "Solflare", img: require("../../assets/wallets/solflare.png") },
  { id: "backpack", name: "Backpack", img: require("../../assets/wallets/backpack.png") },
] as const;
type WalletRow = { id: string; name: string; img?: number };

export default function SignIn() {
  const { accept } = useSession();
  const { securityAsked } = usePrefs();
  const params = useLocalSearchParams<{ name?: string }>();
  const [name, setName] = useState(params.name || badgeCopy.defaultName);
  const nameRef = useRef(name);
  nameRef.current = name;
  const onSession = async (s: SavedSession) => {
    await accept(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const started = Date.now();
    const next = await nextAfterSignIn(s.token, { securityAsked, name: nameRef.current === badgeCopy.defaultName && !params.name ? "" : nameRef.current });
    await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started))));
    router.replace(next as never);
  };
  return env.privyOn
    ? <WithPrivy onSession={onSession} name={name} setName={setName} />
    : <SignInView methods={offline} onSession={onSession} name={name} setName={setName} />;
}

/** The theme toggle on grape (shared ThemeToggle in the hero). */
function ThemeToggle() {
  const { isDark, setTheme } = usePrefs();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"} onPress={() => { tap(); setTheme(isDark ? "light" : "dark"); }}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <Icon name={isDark ? "sun" : "moon"} size={18} color="#fff" />
    </Pressable>
  );
}

function WalletGlyph({ w, size = 42 }: { w: WalletRow; size?: number }) {
  if (w.id === "backpack" && w.img) return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}><Image source={w.img} style={{ width: size * 0.73, height: size * 0.73 }} resizeMode="contain" /></View>;
  if (w.img) return <Image source={w.img} style={{ width: size, height: size, borderRadius: 12 }} />;
  return <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: "#14F1D9", alignItems: "center", justifyContent: "center" }}><Icon name="wallet" size={size * 0.48} color="#0a0a0a" /></View>;
}

function Ring({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }), -1)); }, [p, delay]);
  const st = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.7 }] }));
  return <Animated.View style={[{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 48, borderWidth: 2, borderColor: GRAPE }, st]} />;
}

type Phase = "connect" | "sign" | "signing" | "error";
const short = (a: string) => (a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

/** The web wallet Sheet: connect in the wallet app, then one signature to prove it's yours. */
function WalletSheet({ wallet, onClose, onSession }: { wallet: WalletRow; onClose: () => void; onSession: (s: SavedSession) => Promise<void> }) {
  const k = useC();
  const [phase, setPhase] = useState<Phase>("connect");
  const [err, setErr] = useState("");
  const [address, setAddress] = useState("");
  const [done, setDone] = useState(false);
  const pop = useSharedValue(0);
  useEffect(() => { pop.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.6)) }); }, [pop]);
  const cardSt = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 2), transform: [{ translateY: (1 - pop.value) * 40 }, { scale: 0.94 + pop.value * 0.06 }] }));

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (Platform.OS !== "android") throw new Error(`Open Lexari on your Android phone to connect ${wallet.name}.`);
        setUserAgent(userAgent(Constants.expoConfig?.version || "1.0.0", Device.modelName || "Android"));
        const { authorizeWallet } = await import("@/lib/mwa");
        const w = await authorizeWallet();
        if (cancel) return;
        setAddress(w.address); setPhase("sign");
      } catch (e) {
        if (cancel) return;
        const m = e instanceof Error ? e.message : "The wallet did not connect.";
        setErr(/reject|denied|cancel|declined/i.test(m) ? "You cancelled the connection." : m.split("\n")[0].slice(0, 160));
        setPhase("error");
      }
    })();
    return () => { cancel = true; };
  }, [wallet.name]);

  const sign = async () => {
    setPhase("signing"); setErr("");
    try {
      const { signMessages } = await import("@/lib/mwa");
      const message = await nonceFor(address);
      const [signature, keySig] = await signMessages(address, [message, KEY_MESSAGE]);
      const session = await signInWithServer({ wallet: address, message, signature });
      await rememberKeys(address, keySig).catch(() => null);
      setDone(true);
      await onSession(session);
    } catch (e) {
      console.warn("[lexari] wallet sign-in", e);
      setDone(false);
      setErr(said(e, "Sign-in was rejected."));
      setPhase("sign");
    }
  };

  const title = phase === "error" ? "That didn't connect." : phase === "connect" ? `Opening ${wallet.name}…` : "Sign to prove it's you";
  const sub = phase === "error" ? err : phase === "connect" ? "Approve the connection in your wallet." : "One signature, no transaction. It just proves the wallet is yours.";
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => { if (!done) onClose(); }}>
      {done ? <SignInLoader sub="Your wallet signed. Setting up your session…" /> : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Pressable accessibilityLabel="Cancel" onPress={onClose} style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
          <Animated.View style={[{ width: "100%", maxWidth: 400 }, cardSt]}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 14, bottom: -14, borderRadius: 22, backgroundColor: GRAPE }} />
            <View accessibilityLiveRegion="polite" style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 18, paddingTop: 28, alignItems: "center" }}>
              <Pressable accessibilityLabel="Cancel" onPress={onClose} style={{ position: "absolute", right: 16, top: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} color={k.ink} /></Pressable>
              <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
                <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, borderRadius: 48, backgroundColor: k.tint }} />
                {phase === "connect" || phase === "signing" ? <><Ring delay={0} /><Ring delay={1100} /></> : null}
                <WalletGlyph w={wallet} size={48} />
              </View>
              <Text style={{ marginTop: 18, fontFamily: F.display, fontSize: 22, letterSpacing: -1, lineHeight: 23, color: k.ink, textAlign: "center" }}>{title}</Text>
              <Text style={{ marginTop: 8, fontFamily: F.sans, fontSize: 14.5, lineHeight: 21, color: k.ink75, textAlign: "center" }}>{sub}</Text>
              {(phase === "sign" || phase === "signing") && address ? (
                <View style={{ marginTop: 16, alignSelf: "stretch", borderRadius: 16, backgroundColor: k.alt, borderWidth: 1, borderColor: k.line, padding: 12.8 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: k.ink60 }}>Signing in as</Text>
                  <Text selectable style={{ marginTop: 6, fontFamily: F.mono, fontSize: 12, lineHeight: 19, color: k.ink }}>{address}</Text>
                  <Text style={{ marginTop: 4, fontFamily: F.sans, fontSize: 12.5, lineHeight: 17, color: k.ink60 }}>Your wallet shows the exact message. It names this site and expires in 10 minutes.</Text>
                  {err ? <Text style={{ marginTop: 8, fontFamily: F.sans, fontSize: 13, color: "#e5484d" }}>{err}</Text> : null}
                </View>
              ) : null}
              <View style={{ marginTop: 20, alignSelf: "stretch", gap: 10 }}>
                {phase === "sign" || phase === "signing"
                  ? <Btn full kind="brand" h={42} fs={14} drop={4} icon="edit" disabled={phase === "signing"} label={phase === "signing" ? "Check your wallet…" : "Sign message"} onPress={() => void sign()} />
                  : null}
                {phase === "error" ? <Btn full kind="ink" h={42} fs={14} drop={4} label="Try another way" onPress={onClose} /> : null}
              </View>
              {phase !== "error" ? <Text style={{ marginTop: 14, fontFamily: F.mono, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: k.ink45 }}>{address ? `${wallet.name} · ${short(address)}` : `${wallet.name} · Solana`}</Text> : null}
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

function SignInView({ methods, onSession, name, setName }: { methods: Methods; onSession: (s: SavedSession) => Promise<void>; name: string; setName: (v: string) => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const k = useC();
  const [busy, setBusy] = useState<"" | "google" | "email">("");
  const [msg, setMsg] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [legal, setLegal] = useState<"" | "terms" | "privacy">("");
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [loading, setLoading] = useState(false);
  const seeker = isSolanaMobile({ brand: Device.brand, manufacturer: Device.manufacturer, model: Device.modelName });
  const wallets: WalletRow[] = seeker ? [{ id: "seedvault", name: "Seed Vault" }, ...WALLETS] : [...WALLETS];
  const note = (w: WalletRow) => (w.id === "seedvault" ? "Built into your Seeker." : Platform.OS === "android" ? `Opens in the ${w.name} app.` : "Browser extension on Solana.");

  const google = async () => {
    setEmailMsg(""); setMsg(""); setBusy("google");
    try { setLoading(true); setAuthOpen(false); await methods.google(); }
    catch (e) {
      console.warn("[lexari] sign-in", e);
      setLoading(false);
      setMsg(said(e, "That didn't work. Please try again."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally { setBusy(""); }
  };

  const emailStep = async () => {
    setEmailMsg(""); setBusy("email");
    try {
      if (!sent) {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter a valid email address.");
        await methods.sendCode(email.trim()); setSent(true);
      } else {
        if (code.replace(/\D/g, "").length < 6) throw new Error("Enter the 6-digit code.");
        setLoading(true);
        await methods.verify(email.trim(), code.trim());
        setAuthOpen(false);
      }
    } catch (e) { setLoading(false); console.warn("[lexari] email", e); setEmailMsg(said(e, "That didn't work. Please try again.")); }
    finally { setBusy(""); }
  };

  const closeAuth = () => { if (busy) return; setAuthOpen(false); setEmailMode(false); setSent(false); setCode(""); setEmailMsg(""); };
  const field = { height: 46, borderRadius: 14, borderWidth: 2, borderColor: k.line, backgroundColor: k.alt, color: k.ink, paddingHorizontal: 14.4, fontSize: 15, fontFamily: F.sans };

  return (
    <View style={{ flex: 1, backgroundColor: k.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 28 }} keyboardShouldPersistTaps="handled">
        {/* grape hero: ThemeToggle, the badge, then "Sign in. Meet your agent." */}
        <View style={{ backgroundColor: GRAPE, overflow: "hidden", paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 40 }}>
          <Carpet color="rgba(255,255,255,0.2)" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View accessibilityRole="header" accessibilityLabel="Lexari" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRAPE }} /></View>
              <Text style={{ fontFamily: F.display, fontSize: 20, letterSpacing: -0.9, color: "#fff" }}>lexari</Text>
            </View>
            <ThemeToggle />
          </View>
          <Rise delay={80} style={{ marginTop: 8, alignItems: "center" }}>
            <Badge name={name} setName={setName} type="landing" strap={64} />
            <Text style={{ marginTop: 20, fontFamily: F.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "rgba(255,255,255,0.75)", textAlign: "center" }}>{badgeCopy.hint}</Text>
          </Rise>
          <Rise delay={150} style={{ marginTop: 28 }}><Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.44, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>Day one · getting in</Text></Rise>
          <Rise delay={220}><Text accessibilityRole="header" style={{ marginTop: 16, fontFamily: F.display, fontSize: 24, lineHeight: 22.8, letterSpacing: -1.08, color: "#fff" }}>{"Sign in.\nMeet your agent."}</Text></Rise>
          <Rise delay={290}><Text style={{ marginTop: 16, maxWidth: 460, fontFamily: F.sans, fontSize: 15, lineHeight: 24.4, color: "rgba(255,255,255,0.9)" }}>Use a Solana wallet. Then you name your agent and it clocks in on its own computer.</Text></Rise>
          <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {["scout", "quill", "tally", "frame", "patch"].map((s, i) => (
              <PopIn key={s} delay={200 + i * 80}>
                <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}><Face slug={s} size={31} /></View>
              </PopIn>
            ))}
            <PopIn delay={600} style={{ flexShrink: 1, minWidth: 0 }}>
              <View style={{ height: 44, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.4)", paddingHorizontal: 12, justifyContent: "center" }}>
                <Text style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.36, textTransform: "uppercase", color: "#fff" }}>hire more later</Text>
              </View>
            </PopIn>
          </View>
        </View>

        {/* Welcome in. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, maxWidth: 440, width: "100%", alignSelf: "center" }}>
          <Rise delay={360}><Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 22, letterSpacing: -0.99, lineHeight: 21, color: k.ink }}>Welcome in.</Text></Rise>
          <Rise delay={430}><Text style={{ marginTop: 8, fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: k.ink75 }}>Pick how you want to sign in. No new password to remember.</Text></Rise>
          <Rise delay={500} style={{ marginTop: 24 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google or email" disabled={!!busy} onPress={() => { tap(); setMsg(""); setAuthOpen(true); }} style={({ pressed }) => ({ height: 66, transform: [{ translateY: pressed ? 2 : 0 }] })}>
              <View style={{ position: "absolute", left: 0, right: 0, top: 6, height: 60, borderRadius: 22, backgroundColor: GRAPE }} />
              <View style={{ height: 60, borderRadius: 22, backgroundColor: k.ink, flexDirection: "row", alignItems: "center", gap: 12, padding: 8, paddingRight: 20 }}>
                <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: k.bg, alignItems: "center", justifyContent: "center" }}><Icon name="google" size={20} color={k.ink} /></View>
                <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15.5, color: k.bg }}>Continue with Google or email</Text>
                <Icon name="arrow" size={20} color={k.bg} />
              </View>
            </Pressable>
          </Rise>
          {msg ? <Text accessibilityLiveRegion="polite" style={{ marginTop: 12, fontFamily: F.sans, fontSize: 13, color: "#e5484d" }}>{msg}</Text> : null}
          <Rise delay={570} style={{ marginVertical: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: k.line }} />
            <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: k.ink60 }}>or a Solana wallet</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: k.line }} />
          </Rise>
          <View style={{ gap: 10 }}>
            {wallets.map((w, i) => (
              <Rise key={w.id} delay={640 + i * 70}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Sign in with ${w.name}`} onPress={() => { tap(); setMsg(""); setWallet(w); }}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, backgroundColor: k.card, padding: 8, paddingRight: 16, borderWidth: 2, borderColor: pressed ? GRAPE : k.line, transform: [{ translateY: pressed ? -2 : 0 }] })}>
                  <WalletGlyph w={w} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 21, color: k.ink }}>{w.name}</Text>
                    <Text numberOfLines={1} style={{ marginTop: 2, fontFamily: F.sans, fontSize: 13, lineHeight: 18, color: k.ink75 }}>{note(w)}</Text>
                  </View>
                  <Icon name="arrow" size={18} color={k.ink60} />
                </Pressable>
              </Rise>
            ))}
          </View>
          <View style={{ marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 4 }}>
            <Icon name="verified" size={13} color={k.ink45} />
            <Text style={[T.small, { color: k.ink45, fontFamily: F.sans }]}>By continuing you agree to the</Text>
            <Pressable onPress={() => { tap(); setLegal("terms"); }} hitSlop={8}><Text style={[T.small, { color: k.brandInk, fontFamily: F.semi, textDecorationLine: "underline" }]}>Terms</Text></Pressable>
            <Text style={[T.small, { color: k.ink45, fontFamily: F.sans }]}>and</Text>
            <Pressable onPress={() => { tap(); setLegal("privacy"); }} hitSlop={8}><Text style={[T.small, { color: k.brandInk, fontFamily: F.semi, textDecorationLine: "underline" }]}>Privacy Policy</Text></Pressable>
            <Text style={[T.small, { color: k.ink45 }]}>.</Text>
          </View>
        </View>
      </ScrollView>

      <Sheet open={legal !== ""} onClose={() => setLegal("")} title={legal === "terms" ? "Terms of Service" : "Privacy Policy"}>
        <LegalDoc doc={legal === "terms" ? TERMS : PRIVACY} maxHeight={Math.min(560, Math.round(height * 0.62))} />
      </Sheet>

      {/* Google or email: the Privy login card, in the app's own look */}
      <Modal visible={authOpen} transparent animationType="fade" onRequestClose={closeAuth}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Pressable accessibilityLabel="Close" onPress={closeAuth} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />
          <View style={{ width: "100%", maxWidth: 400 }}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 14, bottom: -14, borderRadius: 22, backgroundColor: GRAPE }} />
            <View style={{ borderRadius: 22, backgroundColor: k.card, borderWidth: 1, borderColor: k.line, padding: 18, paddingTop: 22, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 22, letterSpacing: -1, color: k.ink }}>{sent ? "Check your inbox" : emailMode ? "Continue with email" : "Welcome in."}</Text>
                <Pressable accessibilityLabel="Close" onPress={closeAuth} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} color={k.ink} /></Pressable>
              </View>
              <Text style={{ fontFamily: F.sans, fontSize: 14.5, lineHeight: 21, color: k.ink75 }}>{sent ? `We sent a 6-digit code to ${email.trim()}.` : emailMode ? "We'll email you a one-time code. No password needed." : "Pick how you want to sign in. No new password to remember."}</Text>
              {!emailMode ? (
                <>
                  <Btn full kind="white" h={46} fs={15} drop={4} disabled={!!busy} onPress={() => void google()} style={{ borderRadius: 999 }}>
                    <Icon name="google" size={18} color="#0a0a0a" /><Text style={{ fontFamily: F.bold, fontSize: 15, color: "#0a0a0a" }}>Continue with Google</Text>
                  </Btn>
                  <Btn full kind="line" h={46} fs={15} icon="mail" label="Continue with email" onPress={() => { setEmailMsg(""); setEmailMode(true); }} />
                </>
              ) : (
                <>
                  {sent
                    ? <CodeBoxes value={code} onChange={setCode} />
                    : <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={k.ink45} style={field} autoFocus onSubmitEditing={() => void emailStep()} returnKeyType="send" />}
                  {emailMsg ? <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.sans, fontSize: 13, color: "#e5484d" }}>{emailMsg}</Text> : null}
                  <Btn full kind="brand" h={46} fs={15} drop={4} disabled={busy === "email"} label={busy === "email" ? "Please wait…" : sent ? "Verify and sign in" : "Send code"} onPress={() => void emailStep()} />
                  <Pressable onPress={() => { if (sent) { setSent(false); setCode(""); } else setEmailMode(false); setEmailMsg(""); }} hitSlop={8}>
                    <Text style={{ color: k.brandInk, textAlign: "center", fontFamily: F.semi, fontSize: 13 }}>{sent ? "Use a different email" : "Back"}</Text>
                  </Pressable>
                </>
              )}
              {emailMsg && !emailMode ? <Text style={{ fontFamily: F.sans, fontSize: 13, color: "#e5484d" }}>{emailMsg}</Text> : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {wallet ? <WalletSheet wallet={wallet} onClose={() => setWallet(null)} onSession={onSession} /> : null}
      {loading ? <SignInLoader /> : null}
    </View>
  );
}
