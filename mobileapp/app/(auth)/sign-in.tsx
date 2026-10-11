import { useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoginWithEmail, useLoginWithOAuth, useEmbeddedSolanaWallet, usePrivy } from "@privy-io/expo";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Mail, ShieldCheck, Wallet } from "lucide-react-native";
import { Button, Face, Sheet, T, tap } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { usePrefs } from "@/state/prefs";
import { useSession } from "@/state/session";
import { env } from "@/lib/env";
import { nonceFor, signInWithServer } from "@/lib/authFlow";
import { setUserAgent } from "@/lib/api";
import type { SavedSession } from "@/lib/session";
import { isSolanaMobile, userAgent } from "@/lib/device";

const SOON = "This sign-in option is being switched on. Please try another way for now.";

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

function AuthButton({ icon, label, onPress, busy, light }: { icon: ReactNode; label: string; onPress: () => void; busy?: boolean; light?: boolean }) {
  return (
    <Pressable disabled={busy} onPress={() => { tap(); onPress(); }} style={({ pressed }) => ({ height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: light ? "#fff" : "#13101f", borderWidth: light ? 0 : 1, borderColor: "rgba(255,255,255,0.12)", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      {busy ? <ActivityIndicator color={light ? "#000" : "#fff"} /> : icon}
      <Text style={{ color: light ? "#0a0a0a" : "#fff", fontSize: 15, fontWeight: "600", letterSpacing: -0.2 }}>{label}</Text>
    </Pressable>
  );
}

type Methods = { google: () => Promise<void>; sendCode: (email: string) => Promise<void>; verify: (email: string, code: string) => Promise<void> };

/** The Privy-backed methods. Only mounted when PrivyProvider is present. */
function usePrivyMethods(onSession: (s: SavedSession) => Promise<void>): Methods {
  const emailLogin = useLoginWithEmail();
  const oauth = useLoginWithOAuth();
  const privy = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  const finish = async (email?: string) => {
    const wallet = solana.wallets?.[0];
    let provider = wallet ? await wallet.getProvider() : null;
    if (!provider && solana.create) provider = await solana.create();
    const address = wallet?.address || provider?._publicKey;
    if (!provider || !address) throw new Error("We couldn't set up your wallet. Please try again.");
    const message = await nonceFor(address);
    const signed = await provider.request({ method: "signMessage", params: { message } });
    const token = await privy.getAccessToken();
    await onSession(await signInWithServer({ wallet: address, message, signature: signed.signature, privyToken: token || undefined, email }));
  };
  return {
    google: async () => { await oauth.login({ provider: "google" }); await finish(); },
    sendCode: async (email) => { await emailLogin.sendCode({ email }); },
    verify: async (email, code) => { await emailLogin.loginWithCode({ code, email }); await finish(email); },
  };
}

const offline: Methods = {
  google: async () => { console.warn("[lexari] Google sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  sendCode: async () => { console.warn("[lexari] Email sign-in needs EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID in the build."); throw new Error(SOON); },
  verify: async () => { throw new Error(SOON); },
};

function WithPrivy(p: { onSession: (s: SavedSession) => Promise<void> }) {
  return <SignInView methods={usePrivyMethods(p.onSession)} onSession={p.onSession} />;
}

export default function SignIn() {
  const { accept } = useSession();
  const { securityAsked } = usePrefs();
  const onSession = async (s: SavedSession) => {
    await accept(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace(securityAsked ? "/(tabs)/hub" : "/security-setup");
  };
  return env.privyOn ? <WithPrivy onSession={onSession} /> : <SignInView methods={offline} onSession={onSession} />;
}

function SignInView({ methods, onSession }: { methods: Methods; onSession: (s: SavedSession) => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState<"" | "google" | "wallet" | "email">("");
  const [msg, setMsg] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const seeker = isSolanaMobile({ brand: Device.brand, manufacturer: Device.manufacturer, model: Device.modelName });

  const run = async (kind: "google" | "wallet", fn: () => Promise<void>) => {
    setMsg(""); setBusy(kind);
    try { await fn(); } catch (e) {
      console.warn("[lexari] sign-in", e);
      setMsg(e instanceof Error && e.message.length < 120 ? e.message : "That didn't work. Please try again.");
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
    } catch (e) { console.warn("[lexari] email", e); setEmailMsg(e instanceof Error && e.message.length < 120 ? e.message : "That didn't work. Please try again."); }
    finally { setBusy(""); }
  };

  const input = { height: 50, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "#0b0915", color: "#fff", paddingHorizontal: 14, fontSize: 15 };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Svg width={width} height={height} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="g" cx="50%" cy="22%" rx="80%" ry="40%">
            <Stop offset="0" stopColor="#5b2bff" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#g)" />
      </Svg>
      <View style={{ flex: 1, paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 22 }}>
            <View style={{ marginRight: -14, marginBottom: -4 }}><Face slug="scout" size={58} /></View>
            <View style={{ zIndex: 2 }}><Face size={96} animated /></View>
            <View style={{ marginLeft: -14, marginBottom: -4 }}><Face slug="pulse" size={58} /></View>
          </View>
          <LogoMark size={44} />
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "700", letterSpacing: -1, marginTop: 16, textAlign: "center" }}>Welcome to Lexari</Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14.5, lineHeight: 21, marginTop: 8, textAlign: "center", maxWidth: 300 }}>Sign in to meet your AI team. It takes less than a minute.</Text>
        </View>
        <View style={{ gap: 10 }}>
          <AuthButton light icon={<GoogleG />} label="Continue with Google" busy={busy === "google"} onPress={() => run("google", methods.google)} />
          <AuthButton icon={<Mail color="#fff" size={18} />} label="Continue with email" onPress={() => { setEmailMsg(""); setEmailOpen(true); }} />
          <AuthButton
            icon={seeker ? <Wallet color="#14F1D9" size={18} /> : <View style={{ flexDirection: "row" }}><Image source={require("../../assets/wallets/phantom.png")} style={{ width: 20, height: 20, borderRadius: 6 }} /><Image source={require("../../assets/wallets/solflare.png")} style={{ width: 20, height: 20, borderRadius: 6, marginLeft: -5 }} /></View>}
            label={seeker ? "Continue with Seed Vault" : "Connect wallet"}
            busy={busy === "wallet"}
            onPress={withWallet}
          />
          <View style={{ minHeight: 40, justifyContent: "center" }}>
            {msg ? <Text style={[T.small, { color: "#ffb4c0", textAlign: "center" }]}>{msg}</Text> : (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <ShieldCheck color="rgba(255,255,255,0.45)" size={13} />
                <Text style={[T.small, { color: "rgba(255,255,255,0.45)" }]}>By continuing you agree to the Terms and Privacy Policy.</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <Sheet open={emailOpen} onClose={() => setEmailOpen(false)} title={sent ? "Check your inbox" : "Continue with email"}>
        <Text style={[T.body, { color: "rgba(255,255,255,0.6)" }]}>{sent ? `We sent a 6-digit code to ${email}.` : "We'll email you a one-time code. No password needed."}</Text>
        {sent
          ? <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="6-digit code" placeholderTextColor="rgba(255,255,255,0.35)" style={[input, { letterSpacing: 6, fontSize: 18 }]} autoFocus />
          : <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.35)" style={input} autoFocus />}
        {emailMsg ? <Text style={[T.small, { color: "#ffb4c0" }]}>{emailMsg}</Text> : null}
        <Button label={busy === "email" ? "Please wait…" : sent ? "Verify and sign in" : "Send code"} onPress={emailStep} disabled={busy === "email"} />
        {sent ? <Pressable onPress={() => { setSent(false); setCode(""); }}><Text style={{ color: "#a58bff", textAlign: "center", fontSize: 13 }}>Use a different email</Text></Pressable> : null}
      </Sheet>
    </View>
  );
}

