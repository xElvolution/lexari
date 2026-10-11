import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { PRIVACY, TERMS, type Block, type Doc } from "@/content/legal";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatformMethods } from "@/lib/privyMethods";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Mail, ShieldCheck, Wallet } from "lucide-react-native";
import { Button, Face, Sheet, T, tap } from "@/components/ui";
import { BADGE, FlipIdCard, LandingLogo } from "@/components/Landing";
import { BRAND_BG, BrandBg } from "@/components/BrandBg";
import { LogoMark } from "@/components/Logo";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { env } from "@/lib/env";
import { nonceFor, signInWithServer } from "@/lib/authFlow";
import { setUserAgent } from "@/lib/api";
import type { SavedSession } from "@/lib/session";
import { isSolanaMobile, userAgent } from "@/lib/device";

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

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
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

function AuthButton({ icon, label, onPress, busy, light }: { icon: ReactNode; label: string; onPress: () => void; busy?: boolean; light?: boolean }) {
  return (
    <Pressable disabled={busy} onPress={() => { tap(); onPress(); }} style={({ pressed }) => ({ height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: light ? "#fff" : "#13101f", borderWidth: light ? 0 : 1, borderColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {busy ? <ActivityIndicator color={light ? "#000" : "#fff"} /> : icon}
      <Text style={{ color: light ? "#0a0a0a" : "#fff", fontSize: 15, fontWeight: "600", letterSpacing: -0.2 }}>{label}</Text>
    </Pressable>
  );
}

type Methods = { google: () => Promise<void>; sendCode: (email: string) => Promise<void>; verify: (email: string, code: string) => Promise<void> };

const offline: Methods = {
  google: async () => { console.warn("[lexari] Google sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  sendCode: async () => { console.warn("[lexari] Email sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  verify: async () => { throw new Error(SOON); },
};

function WithPrivy(p: { onSession: (s: SavedSession) => Promise<void> }) {
  return <SignInView methods={usePlatformMethods(p.onSession)} onSession={p.onSession} />;
}

export default function SignIn() {
  const { accept } = useSession();
  const { securityAsked } = usePrefs();
  const onSession = async (s: SavedSession) => {
    await accept(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(securityAsked ? "/(tabs)/agents" : "/security-setup");
  };
  return env.privyOn ? <WithPrivy onSession={onSession} /> : <SignInView methods={offline} onSession={onSession} />;
}

function SignInView({ methods, onSession }: { methods: Methods; onSession: (s: SavedSession) => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ name?: string }>();
  const [badgeName] = useState(params.name || BADGE.defaultName);
  const [busy, setBusy] = useState<"" | "google" | "wallet" | "email">("");
  const [msg, setMsg] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [legal, setLegal] = useState<"" | "terms" | "privacy">("");
  const seeker = isSolanaMobile({ brand: Device.brand, manufacturer: Device.manufacturer, model: Device.modelName });

  const run = async (kind: "google" | "wallet", fn: () => Promise<void>) => {
    setMsg(""); setBusy(kind);
    try { await fn(); } catch (e) {
      console.warn("[lexari] sign-in", e);
      setMsg(said(e, "That didn't work. Please try again."));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } finally { setBusy(""); }
  };

  const withWallet = () => run("wallet", async () => {
    if (Platform.OS !== "android") throw new Error("Open Lexari on your Android phone to connect Phantom, Solflare or Seed Vault.");
    setUserAgent(userAgent(Constants.expoConfig?.version || "1.0.0", Device.modelName || "Android"));
    const { authorizeWallet, signMessage } = await import("@/lib/mwa");
    const wallet = await authorizeWallet();
    const message = await nonceFor(wallet.address);
    const signature = await signMessage(wallet.address, message);
    await onSession(await signInWithServer({ wallet: wallet.address, message, signature }));
  });

  const emailStep = async () => {
    setEmailMsg(""); setBusy("email");
    try {
      if (!sent) {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("Enter a valid email address.");
        await methods.sendCode(email.trim()); setSent(true);
      } else {
        await methods.verify(email.trim(), code.trim());
        setEmailOpen(false);
      }
    } catch (e) { console.warn("[lexari] email", e); setEmailMsg(said(e, "That didn't work. Please try again.")); }
    finally { setBusy(""); }
  };

  const input = { height: 50, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "#0b0915", color: "#fff", paddingHorizontal: 14, fontSize: 15 };

  // The card is about 1.7× its width. Shrink it so the barcode stays above the buttons.
  const chrome = insets.top + insets.bottom + 280;
  const cardW = Math.min(250, width - 80, Math.max(168, (height - chrome) / 1.72));
  return (
    <View style={{ flex: 1, minHeight: height, backgroundColor: BRAND_BG }}>
      <BrandBg width={width} height={height} cy="42%" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: height, paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }} bounces={false}>
        <LandingLogo />
        <View style={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
          <FlipIdCard name={badgeName} width={cardW} faceSize={Math.round(cardW * 0.42)} />
          <Text style={[T.small, { color: "rgba(255,255,255,0.45)", marginTop: 12 }]}>Tap the card to flip it</Text>
        </View>
        <View style={{ gap: 10 }}>
          <AuthButton light icon={<GoogleG />} label="Continue with Google" busy={busy === "google"} onPress={() => run("google", methods.google)} />
          <AuthButton icon={<Mail color="#fff" size={18} />} label="Continue with email" onPress={() => { setEmailMsg(""); setEmailOpen(true); }} />
          <Pressable onPress={withWallet} disabled={busy === "wallet"} style={{ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
            {seeker ? <Wallet color="#14F1D9" size={15} /> : <View style={{ flexDirection: "row" }}><Image source={require("../../assets/wallets/phantom.png")} style={{ width: 16, height: 16, borderRadius: 5 }} /><Image source={require("../../assets/wallets/solflare.png")} style={{ width: 16, height: 16, borderRadius: 5, marginLeft: -4 }} /></View>}
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>{busy === "wallet" ? "Connecting…" : seeker ? "Continue with Seed Vault" : "Connect wallet"}</Text>
          </Pressable>
          <View style={{ minHeight: 40, justifyContent: "center", gap: 6 }}>
            {msg ? <Text style={[T.small, { color: "#ffb4c0", textAlign: "center" }]}>{msg}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 4 }}>
              <ShieldCheck color="rgba(255,255,255,0.45)" size={13} />
              <Text style={[T.small, { color: "rgba(255,255,255,0.45)" }]}>By continuing you agree to the</Text>
              <Pressable onPress={() => { tap(); setLegal("terms"); }} hitSlop={8}><Text style={[T.small, { color: "#d9ccff", textDecorationLine: "underline" }]}>Terms</Text></Pressable>
              <Text style={[T.small, { color: "rgba(255,255,255,0.45)" }]}>and</Text>
              <Pressable onPress={() => { tap(); setLegal("privacy"); }} hitSlop={8}><Text style={[T.small, { color: "#d9ccff", textDecorationLine: "underline" }]}>Privacy Policy</Text></Pressable>
              <Text style={[T.small, { color: "rgba(255,255,255,0.45)" }]}>.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <Sheet open={legal !== ""} onClose={() => setLegal("")} title={legal === "terms" ? "Terms of Service" : "Privacy Policy"}>
        <LegalDoc doc={legal === "terms" ? TERMS : PRIVACY} maxHeight={Math.min(560, Math.round(height * 0.62))} />
      </Sheet>
      <Modal visible={emailOpen} transparent animationType="fade" onRequestClose={() => setEmailOpen(false)}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 22 }}>
          <Pressable accessibilityLabel="Close" onPress={() => setEmailOpen(false)} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.62)" }} />
          <View style={{ width: "100%", maxWidth: 420, borderRadius: 24, backgroundColor: "#13101f", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", padding: 20, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={[T.h2, { color: "#fff", flex: 1 }]}>{sent ? "Check your inbox" : "Continue with email"}</Text>
              <Pressable accessibilityLabel="Close" onPress={() => setEmailOpen(false)} hitSlop={10}><Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 22, lineHeight: 24 }}>×</Text></Pressable>
            </View>
            <Text style={[T.body, { color: "rgba(255,255,255,0.6)" }]}>{sent ? `We sent a 6-digit code to ${email}.` : "We'll email you a one-time code. No password needed."}</Text>
            {sent
              ? <CodeBoxes value={code} onChange={setCode} />
              : <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.35)" style={input} autoFocus />}
            {emailMsg ? <Text style={[T.small, { color: "#ffb4c0" }]}>{emailMsg}</Text> : null}
            <Button label={busy === "email" ? "Please wait…" : sent ? "Verify and sign in" : "Send code"} onPress={emailStep} disabled={busy === "email"} />
            {sent ? <Pressable onPress={() => { setSent(false); setCode(""); }}><Text style={{ color: "#a58bff", textAlign: "center", fontSize: 13 }}>Use a different email</Text></Pressable> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

