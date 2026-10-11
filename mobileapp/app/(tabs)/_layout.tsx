import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import Icon from "@/components/Icon";
import { tap } from "@/components/ui";
import { F, GRAPE, TopBar, useC } from "@/web/kit";
import { initialsOf, useData } from "@/web/data";

/** Same as the web phone nav (AppShell PhoneNav): Agents, Brain, Market, Team, More; More swaps the row for Wallets, Settings, Profile, Hub, Close. */
const PRIMARY = [
  { name: "agents", label: "Agents", icon: "home" },
  { name: "brain", label: "Brain", icon: "memory" },
  { name: "marketplace", label: "Market", icon: "market" },
  { name: "team", label: "Team", icon: "team" },
];
const SECONDARY = [
  { name: "wallets", label: "Wallets", icon: "wallet" },
  { name: "settings", label: "Settings", icon: "settings" },
  { name: "profile", label: "Profile", icon: "user" },
  { name: "hub", label: "Hub", icon: "hub" },
];
const SEC = new Set(SECONDARY.map((s) => s.name));

function PhoneNav({ state, navigation }: BottomTabBarProps) {
  const k = useC();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const [more, setMore] = useState(SEC.has(current));
  useEffect(() => { if (SEC.has(current)) setMore(true); }, [current]);
  const items = more ? [...SECONDARY, { name: "close", label: "Close", icon: "x" }] : [...PRIMARY, { name: "more", label: "More", icon: "more" }];
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: k.line, backgroundColor: k.bg, paddingBottom: insets.bottom }}>
      <Animated.View key={more ? "b" : "a"} entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(150)} style={{ height: 66, flexDirection: "row" }}>
        {items.map((it) => {
          const on = it.name === current;
          return (
            <Pressable key={it.name} accessibilityRole="button" accessibilityLabel={it.label} onPress={() => {
              tap();
              if (it.name === "more") setMore(true);
              else if (it.name === "close") setMore(false);
              else navigation.navigate(it.name);
            }} style={{ flex: 1, alignItems: "center", paddingTop: 8, gap: 4 }}>
              <View style={{ width: 48, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: on ? GRAPE : "transparent" }}>
                <Icon name={it.icon} size={21} color={on ? "#fff" : k.ink75} />
              </View>
              <Text style={{ fontFamily: F.bold, fontSize: 11, color: on ? k.ink : k.ink60 }}>{it.label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

function Bar() {
  const { me } = useData();
  return <TopBar initials={initialsOf(me)} />;
}

export default function TabsLayout() {
  const k = useC();
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: insets.top }}>
        <Bar />
        <Tabs tabBar={(p) => <PhoneNav {...p} />} screenListeners={{ tabPress: () => tap() }} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: k.bg }, animation: "fade" }}>
          {[...PRIMARY, ...SECONDARY].map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />)}
        </Tabs>
      </View>
    </>
  );
}
