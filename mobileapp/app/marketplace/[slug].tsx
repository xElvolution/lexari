/** A specialist's listing. Hire uses the same balance confirmation as the phone website. */
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "@/components/Icon";
import { ROSTER, specialist, storeMeta } from "@/content/roster";
import { AgentTile, GRAPE, Label, T, useC } from "@/web/kit";
import { useData } from "@/web/data";
import { useHire } from "@/web/hire";

export default function HireDetail() {
  const { slug = "" } = useLocalSearchParams<{ slug: string }>();
  const k = useC();
  const insets = useSafeAreaInsets();
  const { me } = useData();
  const hire = useHire();
  const person = specialist(slug);
  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: insets.top, padding: 20 }}>
        <T f="bold" s={20}>That agent isn't on the marketplace.</T>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}><T f="bold" s={15} c={GRAPE}>Back</T></Pressable>
      </View>
    );
  }
  const m = storeMeta(person);
  const hired = !!me?.agents.some((x) => x.slug === person.slug);
  const again = !hired && !!me?.hires?.some((h) => h.slug === person.slug);
  return (
    <View style={{ flex: 1, backgroundColor: k.bg, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
          <Icon name="back" size={16} color={k.ink75} /><T f="bold" s={14} c={k.ink75}>Marketplace</T>
        </Pressable>
        <View style={{ marginTop: 16, alignSelf: "flex-start" }}><AgentTile slug={person.slug} size={88} radius={26} dot={false} /></View>
        <T f="display" s={40} style={{ marginTop: 12, letterSpacing: -1.6 }}>{person.name}</T>
        <T f="semi" s={16} c={k.brandInk} style={{ marginTop: 4 }}>{m.maker}</T>
        <T s={15} c={k.ink75} style={{ marginTop: 10, lineHeight: 22 }}>{person.back}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <View style={{ borderRadius: 999, backgroundColor: k.tint, paddingHorizontal: 10, paddingVertical: 6 }}><T f="semi" s={13}>{m.cat}</T></View>
          <View style={{ borderRadius: 999, backgroundColor: k.tint, paddingHorizontal: 10, paddingVertical: 6 }}><T f="semi" s={13}>{person.job}</T></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><T f="bold" s={13}>{String(person.rating)}</T><Icon name="star" size={13} color={k.brandInk} /></View>
        </View>
        <Pressable onPress={() => (hired ? router.push(`/chat/${person.slug}`) : hire.start(person.slug))} style={{ marginTop: 20, height: 48, borderRadius: 24, backgroundColor: hired ? k.tint : GRAPE, alignItems: "center", justifyContent: "center" }}>
          <T f="bold" s={16} c={hired ? k.brandInk : "#fff"}>{hired ? "Open" : person.free || again ? "Hire · Free" : "Hire · $1"}</T>
        </Pressable>
        <Label s={9} c={k.ink45} style={{ marginTop: 22 }}>Skills</Label>
        <View style={{ marginTop: 8, gap: 8 }}>
          {person.skills.map(([name, n]) => (
            <View key={name}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T f="semi" s={13}>{name}</T><T s={12} c={k.ink45}>{String(n)}</T></View>
              <View style={{ marginTop: 4, height: 6, borderRadius: 3, backgroundColor: k.tint }}><View style={{ width: `${n}%`, height: 6, borderRadius: 3, backgroundColor: GRAPE }} /></View>
            </View>
          ))}
        </View>
        <T s={13} c={k.ink45} style={{ marginTop: 18 }}>{ROSTER.length ? person.speed : ""}</T>
      </ScrollView>
      {hire.node}
    </View>
  );
}
