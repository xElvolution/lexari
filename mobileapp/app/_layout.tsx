import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PrivyRoot } from "@/lib/privyRoot";
import { PrefsProvider, usePrefs } from "@/state/prefs";
import { SessionProvider } from "@/state/session";
import { LockGate } from "@/components/Gates";
import Tour from "@/components/Tour";
import { env } from "@/lib/env";
import { DataProvider } from "@/web/data";
import { useFonts } from "expo-font";
import { Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold } from "@expo-google-fonts/figtree";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { MartianMono_400Regular, MartianMono_500Medium } from "@expo-google-fonts/martian-mono";

function Navigator() {
  const { palette, isDark } = usePrefs();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <LockGate>
        <Stack screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: palette.bg } }}>
          <Stack.Screen name="index" options={{ animation: "none", contentStyle: { backgroundColor: "#14072e" } }} />
          <Stack.Screen name="settings/billing" options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
          <Stack.Screen name="welcome" options={{ animation: "fade", contentStyle: { backgroundColor: "#14072e" } }} />
          <Stack.Screen name="(auth)/sign-in" options={{ animation: "fade", contentStyle: { backgroundColor: "#14072e" } }} />
          <Stack.Screen name="security-setup" options={{ animation: "fade", contentStyle: { backgroundColor: "#14072e" } }} />
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="chat/[slug]" options={{ animation: "slide_from_right" }} />
        </Stack>
        <Tour />
      </LockGate>
    </View>
  );
}

export default function Root() {
  const [fonts] = useFonts({ Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold, BricolageGrotesque_800ExtraBold, MartianMono_400Regular, MartianMono_500Medium });
  const nav = fonts ? <Navigator /> : <View style={{ flex: 1, backgroundColor: "#000" }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <SessionProvider>
          <DataProvider>
            <PrivyRoot appId={env.privyAppId} clientId={env.privyClientId}>{nav}</PrivyRoot>
          </DataProvider>
          </SessionProvider>
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
