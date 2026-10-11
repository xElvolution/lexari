/** Marketplace pieces shared by the store and a listing (webapp/components/market/parts.tsx): hire button, store tile, shelf. */
import { createContext, useContext, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { PALETTE } from "@/components/avatar";
import { compact, storeMeta, type Specialist } from "@/content/roster";
import { AgentTile, Grad, Label, T, useC } from "@/web/kit";
import { useData } from "@/web/data";

export const open = (slug: string) => router.push(`/marketplace/${slug}`);
/** Provide useHire().start so every Hire button opens the same confirmation. */
export const HireCtx = createContext<(slug: string) => void>(() => {});

export function HireBtn({ a, lg }: { a: Specialist; lg?: boolean }) {
  const k = useC();
  const onHire = useContext(HireCtx);
  const { me } = useData();
  const hired = !!me?.agents.some((x) => x.slug === a.slug);
  const again = !hired && !!me?.hires?.some((h) => h.slug === a.slug);
  const h = lg ? 48 : 32;
  return (
    <Pressable onPress={() => (hired ? router.push(`/chat/${a.slug}`) : onHire(a.slug))} style={{ height: h, paddingHorizontal: lg ? 24 : 16, borderRadius: h / 2, alignItems: "center", justifyContent: "center", backgroundColor: hired ? k.tint : "#5b2bff" }}>
      <T f="bold" s={lg ? 16 : 13} c={hired ? k.brandInk : "#fff"}>{hired ? "Open" : a.free || again ? "Hire · Free" : "Hire · $1"}</T>
    </Pressable>
  );
}


/** webapp StarRow: five stars, the rating's rounded count filled. */
export function StarRow({ v, size = 12 }: { v: number; size?: number }) {
  const k = useC();
  return <View accessibilityLabel={`${v} out of 5`} style={{ flexDirection: "row", gap: 2 }}>{[1, 2, 3, 4, 5].map((i) => <View key={i} style={{ opacity: i <= Math.round(v) ? 1 : 0.25 }}><Icon name="star" size={size} color={k.brandInk} /></View>)}</View>;
}

function FlipChip() {
  return <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}><Icon name="flip" size={13} color="rgba(255,255,255,0.9)" /></View>;
}

/** Store tile: tap the picture to flip it (rating, hires, skills, price, speed, Open listing). */
export function AppCard({ a, wide, width }: { a: Specialist; wide?: boolean; width: number }) {
  const k = useC();
  const m = storeMeta(a);
  const [flipped, setFlipped] = useState(false);
  const h = wide ? 236 : Math.round(width * 1.325);
  const col = PALETTE[a.face];
  const skills = a.skills.slice(0, wide ? 2 : 3); const more = a.skills.length - skills.length;
  return (
    <View style={{ width }}>
      <Pressable onPress={() => setFlipped((v) => !v)} style={{ height: h, borderRadius: 22, overflow: "hidden" }}>
        {!flipped ? (
          wide ? (
            <View style={{ flex: 1, padding: 16, justifyContent: "space-between", borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <Grad angle={125} stops={[["#0a0a0a", 0], ["#1d0f5c", 0.58], [col.shade, 1]]} radial={[{ cx: "88%", cy: "18%", r: "75%", color: col.fill, opacity: 0.7 }]} />
              <View style={{ position: "absolute", right: -40, top: -48, width: 160, height: 160, borderRadius: 80, borderWidth: 18, borderColor: col.fill, opacity: 0.25 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 36 }}>
                <View style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={8.5} c="#0a0a0a">New</Label></View>
                <Label s={8.5} c="rgba(255,255,255,0.7)">{a.job}</Label>
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
                <AgentTile slug={a.slug} size={84} dot={false} />
                <T f="semi" s={14} c="rgba(255,255,255,0.9)" style={{ flex: 1, textAlign: "right", paddingBottom: 4 }}>{`“${a.quip}”`}</T>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, borderRadius: 22, backgroundColor: k.faceTile, borderWidth: 1, borderColor: k.line, alignItems: "center", justifyContent: "center" }}><AgentTile slug={a.slug} size={136} dot={false} /></View>
          )
        ) : (
          <View style={{ flex: 1, backgroundColor: "#0a0a0a", borderRadius: 22, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><T f="bold" s={13} c="#fff">{String(a.rating)}</T><Icon name="star" size={12} color="#c9b8ff" /></View><T s={13} c="rgba(255,255,255,0.65)">{`${compact(m.hires)} hires`}</T></View>
            <Label s={8.5} c="#c9b8ff" style={{ marginTop: 10 }}>Skills</Label>
            {skills.map(([s]) => <T key={s} s={12} c="rgba(255,255,255,0.85)" lines={2} style={{ marginTop: 4 }}>{`· ${s}`}</T>)}
            {more > 0 ? <T s={12} c="rgba(255,255,255,0.45)" style={{ marginTop: 4 }}>{`+${more} more`}</T> : null}
            <View style={{ marginTop: "auto", gap: 4 }}>
              <View style={{ alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}><T f="bold" s={11.5} c="#fff">{m.free ? "Free" : "Paid add-ons"}</T></View>
              <T s={11.5} c="rgba(255,255,255,0.6)">{a.speed}</T>
            </View>
            <Pressable onPress={() => open(a.slug)} style={{ marginTop: 10, height: 32, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><T f="bold" s={12.5} c="#0a0a0a">Open listing →</T></Pressable>
          </View>
        )}
        <FlipChip />
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10 }}>
        <Pressable onPress={() => open(a.slug)} style={{ flex: 1 }}>
          <T f="bold" s={14.5} lines={1}>{a.name}</T>
          <T s={12.5} c={k.ink45} lines={2}>{`${m.maker} · ${m.cat}`}</T>
        </Pressable>
        <HireBtn a={a} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
        <T f="semi" s={12} c={k.ink60}>{String(a.rating)}</T><Icon name="star" size={11} color={k.ink60} /><T s={12} c={k.ink45}>{` · ${compact(m.hires)} hires`}</T>
        <Pressable onPress={() => open(a.slug)} style={{ marginLeft: "auto" }}><T f="bold" s={12.5} c={k.brandInk}>Open</T></Pressable>
      </View>
    </View>
  );
}

export function Shelf({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const k = useC();
  return (
    <View style={{ marginTop: 36 }}>
      <T f="bold" s={18} style={{ letterSpacing: -0.45, lineHeight: 27 }}>{title}</T>
      <T s={13.5} c={k.ink45} style={{ marginTop: 2 }}>{sub}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>{children}</ScrollView>
    </View>
  );
}

