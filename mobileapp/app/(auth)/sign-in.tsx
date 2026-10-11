/**
 * Port of webapp/app/signin + webapp/components/SignInPage.tsx at phone size (webapp/app/mobile-compact.css).
 * The grape hero ("Sign in. Meet your agent." and the faces row), then "Welcome in." with Google or email (Privy) only.
 * Mobile Wallet Adapter stays in the app for paying and topping up (wallets tab, chat send card), not for signing in.
 */
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatformMethods } from "@/lib/privyMethods";
import * as Haptics from "expo-haptics";
import { Face, tap } from "@/components/ui";
import Icon from "@/components/Icon";
import { Carpet } from "@/components/Badge";
import SignInLoader from "@/components/SignInLoader";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { env } from "@/lib/env";
import { nextAfterSignIn } from "@/lib/route";
import type { SavedSession } from "@/lib/session";
import { Btn, F, GRAPE, PopIn, Rise, useC } from "@/web/kit";

const SOON = "This sign-in option is being switched on. Please try another way for now.";

function said(error: unknown, fallback: string) {
  if (error instanceof TypeError && /failed to fetch/i.test(error.message)) return "Couldn't reach Lexari. The sign-in server did not answer.";
  return error instanceof Error && error.message.length < 120 ? error.message : fallback;
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

function WithPrivy(p: { onSession: (s: SavedSession) => Promise<void> }) {
  return <SignInView methods={usePlatformMethods(p.onSession)} />;
}


export default function SignIn() {
  const { accept } = useSession();
  const { securityAsked } = usePrefs();
  const params = useLocalSearchParams<{ name?: string }>();
  const name = params.name || "";
  const nameRef = useRef(name);
  nameRef.current = name;
  const onSession = async (s: SavedSession) => {
    await accept(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const started = Date.now();
    const next = await nextAfterSignIn(s.token, { securityAsked, name: nameRef.current });
    await new Promise((r) => setTimeout(r, Math.max(0, 1100 - (Date.now() - started))));
    router.replace(next as never);
  };
  return env.privyOn
    ? <WithPrivy onSession={onSession} />
    : <SignInView methods={offline} />;
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

function SignInView({ methods }: { methods: Methods }) {
  const insets = useSafeAreaInsets();
  const k = useC();
  const [busy, setBusy] = useState<"" | "google" | "email">("");
  const [msg, setMsg] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* grape hero: ThemeToggle, the badge, then "Sign in. Meet your agent." */}
        <View style={{ flexGrow: 1, backgroundColor: GRAPE, overflow: "hidden", paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 40 }}>
          <Carpet color="rgba(255,255,255,0.2)" />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View accessibilityRole="header" accessibilityLabel="Lexari" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GRAPE }} /></View>
              <Text style={{ fontFamily: F.display, fontSize: 20, letterSpacing: -0.9, color: "#fff" }}>lexari</Text>
            </View>
            <ThemeToggle />
          </View>
          <Rise delay={80} style={{ marginTop: 24 }}><Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.44, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>Day one · getting in</Text></Rise>
          <Rise delay={150}><Text accessibilityRole="header" style={{ marginTop: 16, fontFamily: F.display, fontSize: 24, lineHeight: 22.8, letterSpacing: -1.08, color: "#fff" }}>{"Sign in.\nMeet your agent."}</Text></Rise>
          <Rise delay={220}><Text style={{ marginTop: 16, maxWidth: 448, fontFamily: F.sans, fontSize: 15, lineHeight: 24.4, color: "rgba(255,255,255,0.9)" }}>Use Google or email. Then you name your agent and it clocks in on its own computer.</Text></Rise>
          <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {["scout", "quill", "tally", "frame", "patch"].map((s, i) => (
              <PopIn key={s} delay={200 + i * 80}>
                <View style={{ width: 40, height: 44, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" }}><Face slug={s} size={40} /></View>
              </PopIn>
            ))}
            <PopIn delay={600} style={{ flex: 1, minWidth: 0 }}>
              <View style={{ height: 44, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.4)", paddingHorizontal: 12, justifyContent: "center" }}>
                <Text style={{ fontFamily: F.mono, fontSize: 11, lineHeight: 16.5, letterSpacing: 0.44, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>hire more later</Text>
              </View>
            </PopIn>
          </View>
        </View>

        {/* Welcome in. */}
        <View style={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 28 }}>
        <View style={{ maxWidth: 440, width: "100%", alignSelf: "center" }}>
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
        </View>
        </View>
      </ScrollView>


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

      {loading ? <SignInLoader /> : null}
    </View>
  );
}
