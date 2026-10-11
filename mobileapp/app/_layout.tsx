import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PrivyProvider } from "@privy-io/expo";
import { PrefsProvider, usePrefs } from "@/state/prefs";
import { SessionProvider } from "@/state/session";
import { LockGate } from "@/components/Gates";
import { env } from "@/lib/env";

function Navigator() {
  const { palette, isDark } = usePrefs();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LockGate>
        <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: palette.bg } }}>
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="welcome" options={{ animation: "fade", contentStyle: { backgroundColor: "#000" } }} />
          <Stack.Screen name="(auth)/sign-in" options={{ animation: "fade", contentStyle: { backgroundColor: "#000" } }} />
          <Stack.Screen name="security-setup" options={{ animation: "fade", contentStyle: { backgroundColor: "#000" } }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="chat/[slug]" options={{ animation: "slide_from_right" }} />
        </Stack>
      </LockGate>
    </View>
  );
}

export default function Root() {
  const nav = <Navigator />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <SessionProvider>
            {env.privyOn ? <PrivyProvider appId={env.privyAppId} clientId={env.privyClientId || undefined}>{nav}</PrivyProvider> : nav}
          </SessionProvider>
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
