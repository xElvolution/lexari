import { Platform, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bot, LayoutGrid, Settings, Store, Wallet } from "lucide-react-native";
import { usePrefs } from "@/state/prefs";
import { tap } from "@/components/ui";

const TABS = [
  { name: "hub", title: "Hub", Icon: LayoutGrid },
  { name: "agents", title: "Agents", Icon: Bot },
  { name: "marketplace", title: "Market", Icon: Store },
  { name: "wallet", title: "Wallet", Icon: Wallet },
  { name: "me", title: "Settings", Icon: Settings },
] as const;

export default function TabsLayout() {
  const { palette } = usePrefs();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenListeners={{ tabPress: () => tap() }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: palette.alt, borderTopColor: palette.line, height: 58 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 6 : 8) },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      {TABS.map(({ name, title, Icon }) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarAccessibilityLabel: title,
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center", gap: 3, width: 64 }}>
              <View style={{ width: 48, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: focused ? "rgba(91,43,255,0.22)" : "transparent" }}>
                <Icon color={focused ? palette.brand : palette.muted} size={20} strokeWidth={focused ? 2.3 : 1.8} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: focused ? "700" : "500", color: focused ? palette.ink : palette.muted }}>{title}</Text>
            </View>
          ),
        }} />
      ))}
    </Tabs>
  );
}
