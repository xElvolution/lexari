/** Phone kit that mirrors app.lexari.ai at 390px: colours, type scale, top bar, agent tiles with rings, labels, pills. */
import { useState, type ReactNode } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Modal, Pressable, ScrollView, Text, View, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { Face, tap } from "@/components/ui";
import AgentFace from "@/components/AgentFace";
import { lookVariant } from "@/components/avatar";
import { usePrefs } from "@/state/prefs";
import { NotifyBell } from "@/components/Notifications";

export const GRAPE = "#5b2bff", GRAPE_SOFT = "#8f6bff", GOLD = "#f5c542", SILVER = "#c4c8d2", ONLINE = "#22c55e", IDLE = "#8a8797";
export const F = {
  sans: "Figtree_500Medium", semi: "Figtree_600SemiBold", bold: "Figtree_700Bold", xbold: "Figtree_800ExtraBold",
  display: "BricolageGrotesque_800ExtraBold", mono: "MartianMono_400Regular", monoB: "MartianMono_500Medium",
};

/** Theme colours, same as shared/styles/theme.css. */
export function useC() {
  const { palette, isDark } = usePrefs();
  return {
    dark: isDark, bg: palette.bg, alt: palette.alt, card: palette.card, tint: palette.tint, ink: palette.ink, line: palette.line,
    brandInk: isDark ? "#a58bff" : "#5b2bff", faceTile: isDark ? "#0a0a0a" : "#ffffff",
    ink60: isDark ? "rgba(255,255,255,0.6)" : "rgba(10,10,10,0.6)", ink75: isDark ? "rgba(255,255,255,0.75)" : "rgba(10,10,10,0.75)",
    ink45: isDark ? "rgba(255,255,255,0.45)" : "rgba(10,10,10,0.45)",
  };
}
export type C = ReturnType<typeof useC>;

export function T({ f = "sans", s = 14, c, style, children, lines, ...rest }: { f?: keyof typeof F; s?: number; c?: string; style?: TextStyle | TextStyle[]; children: ReactNode; lines?: number; onPress?: () => void }) {
  const k = useC();
  return <Text numberOfLines={lines} {...rest} style={[{ fontFamily: F[f], fontSize: s, color: c ?? k.ink }, style as TextStyle]}>{children}</Text>;
}
/** The mono uppercase eyebrow (.label). */
export function Label({ children, c, s = 10, style }: { children: ReactNode; c?: string; s?: number; style?: TextStyle }) {
  const k = useC();
  return <Text style={[{ fontFamily: F.mono, fontSize: s, letterSpacing: s * 0.06, textTransform: "uppercase", color: c ?? k.brandInk }, style]}>{children}</Text>;
}
export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void }) {
  const k = useC();
  const st = [{ backgroundColor: k.card, borderRadius: 18, borderWidth: 1, borderColor: k.line }, style as ViewStyle];
  return onPress ? <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [...st, pressed && { opacity: 0.85 }]}>{children}</Pressable> : <View style={st}>{children}</View>;
}
/** Rounded pill button: brand (purple), light (white), ghost (tint), outline. */
export function Pill({ label, onPress, kind = "brand", icon, h = 40, style, disabled, fs = 14 }: { label: string; onPress?: () => void; kind?: "brand" | "light" | "ghost" | "outline" | "soft"; icon?: string; h?: number; style?: ViewStyle; disabled?: boolean; fs?: number }) {
  const k = useC();
  const bg = kind === "brand" ? GRAPE : kind === "light" ? (k.dark ? "#fff" : "#0a0a0a") : kind === "ghost" ? k.tint : kind === "soft" ? "rgba(255,255,255,0.15)" : "transparent";
  const fg = kind === "brand" || kind === "soft" ? "#fff" : kind === "light" ? (k.dark ? "#0a0a0a" : "#fff") : k.ink;
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress?.(); }} style={({ pressed }) => [{ height: h, borderRadius: h / 2, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: bg, borderWidth: kind === "outline" ? 1.5 : 0, borderColor: k.ink, opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {icon ? <Icon name={icon} size={fs + 2} color={fg} /> : null}
      <Text style={{ fontFamily: F.bold, fontSize: fs, color: fg }}>{label}</Text>
    </Pressable>
  );
}
export function Round({ icon, onPress, size = 44, badge, filled, label }: { icon?: string; onPress?: () => void; size?: number; badge?: string; filled?: ReactNode; label: string }) {
  const k = useC();
  return (
    <Pressable accessibilityLabel={label} onPress={() => { tap(); onPress?.(); }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: filled ? k.ink : "transparent", borderWidth: filled ? 0 : 1, borderColor: k.line }}>
      {filled ?? <Icon name={icon!} size={19} color={k.ink} />}
      {badge ? <View style={{ position: "absolute", top: -4, right: -6, minWidth: 22, height: 18, borderRadius: 9, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: k.bg }}><Text style={{ fontFamily: F.bold, fontSize: 10, color: "#fff" }}>{badge}</Text></View> : null}
    </Pressable>
  );
}
export function Logo() {
  const k = useC();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <View style={{ width: 25, height: 25, borderRadius: 8, backgroundColor: k.ink, alignItems: "center", justifyContent: "center" }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: k.bg }} /></View>
      <Text style={{ fontFamily: F.display, fontSize: 23, letterSpacing: -1, color: k.ink }}>lexari</Text>
    </View>
  );
}

export type Ring = "primary" | "made" | "hired" | null;
export function ringOf(slug: string, kind?: string, primary = "home"): Ring {
  if (slug === primary) return "primary";
  return slug === "home" || kind === "custom" || slug.startsWith("c-") ? "made" : "hired";
}
/** An agent face on its tile with the gold / purple / silver ring and a presence dot (faces.tsx AgentTile). */
export function AgentTile({ slug, look, size = 48, ring, dot = true, live = false }: { slug: string; look?: unknown; size?: number; ring?: Ring; dot?: boolean; live?: boolean }) {
  const k = useC();
  const r = Math.round(size * 0.32), d = Math.max(8, Math.round(size * 0.24));
  const rc = ring === "primary" ? GOLD : ring === "made" ? GRAPE_SOFT : ring === "hired" ? (k.dark ? SILVER : "#a9aebb") : null;
  const face = Math.round(size * 0.74);
  const lk = look && typeof look === "object" && Object.keys(look as object).some((x) => x !== "v") ? lookVariant(look as never) : null;
  return (
    <View style={{ width: size, height: size }}>
      {rc ? <View style={{ position: "absolute", left: -4, top: -4, right: -4, bottom: -4, borderRadius: r + 4, borderWidth: 2, borderColor: rc, ...(ring === "primary" ? { shadowColor: GOLD, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null) }} /> : null}
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: k.faceTile, borderWidth: 1, borderColor: k.line, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {lk ? <AgentFace variant={lk} size={face} /> : <Face slug={slug === "home" ? undefined : slug} size={face} />}
      </View>
      {dot && ring ? <View style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, right: -d * 0.15, bottom: -d * 0.15, backgroundColor: live ? ONLINE : IDLE, borderWidth: 2, borderColor: k.alt }} /> : null}
    </View>
  );
}

/** The phone top bar: logo, bell, theme toggle, profile initials. */
export function TopBar({ initials = "A" }: { initials?: string }) {
  const k = useC();
  const { setTheme, isDark } = usePrefs();
  return (
    <View style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: k.line, backgroundColor: k.bg }}>
      <Pressable onPress={() => router.navigate("/(tabs)/agents")}><Logo /></Pressable>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <NotifyBell />
        <Round label="Theme" icon={isDark ? "sun" : "moon"} onPress={() => setTheme(isDark ? "light" : "dark")} />
        <Round label="Profile" filled={<Text style={{ fontFamily: F.bold, fontSize: 13, color: k.bg }}>{initials}</Text>} onPress={() => router.navigate("/(tabs)/profile")} />
      </View>
    </View>
  );
}

/** Segmented tabs (Daily / Weekly / Hard, Account / Security, Wallet / Cards). */
export function Segs<K extends string>({ items, on, set, style }: { items: { k: K; label: string; icon?: string; badge?: number }[]; on: K; set: (k: K) => void; style?: ViewStyle }) {
  const k = useC();
  return (
    <View style={[{ flexDirection: "row", backgroundColor: k.tint, borderRadius: 999, padding: 4 }, style]}>
      {items.map((it) => {
        const a = it.k === on;
        return (
          <Pressable key={it.k} onPress={() => { tap(); set(it.k); }} style={{ flex: 1, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: a ? k.card : "transparent", borderWidth: a ? 1 : 0, borderColor: k.line }}>
            {it.icon ? <Icon name={it.icon} size={15} color={a ? k.ink : k.ink60} /> : null}
            <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: a ? k.ink : k.ink60 }}>{it.label}</Text>
            {it.badge ? <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.bold, fontSize: 10, color: "#fff" }}>{it.badge}</Text></View> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
export const short = (a?: string | null, n = 4) => (a ? `${a.slice(0, n)}…${a.slice(-n)}` : "");

/** Bottom sheet like the web phone sheets: rounded top, title + round close, scrolling body. */
export function WSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const k = useC();
  if (!open) return null;
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%", backgroundColor: k.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: k.line }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 18, color: k.ink }}>{title}</Text>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={18} color={k.ink75} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 4 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}
let coinN = 0;
/** A Lexari coin (port of hub/coin.tsx): purple, a white spark in the middle. */
export function Coin({ size = 14 }: { size?: number }) {
  const [u] = useState(() => `cn${++coinN}`);
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id={u + "a"} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#b9a3ff" /><Stop offset=".55" stopColor="#7c4dff" /><Stop offset="1" stopColor="#4a1fe0" /></LinearGradient>
        <LinearGradient id={u + "b"} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#6a3cff" /><Stop offset="1" stopColor="#3514b0" /></LinearGradient>
      </Defs>
      <Circle cx="20" cy="21.5" r="17" fill="#2a0e8f" />
      <Circle cx="20" cy="19.5" r="17" fill={`url(#${u}a)`} />
      <Circle cx="20" cy="19.5" r="12.6" fill={`url(#${u}b)`} stroke="#d9ccff" strokeOpacity={0.55} strokeWidth={1.2} />
      <Path d="M20 11.5 L22.1 17.4 L28 19.5 L22.1 21.6 L20 27.5 L17.9 21.6 L12 19.5 L17.9 17.4 Z" fill="#fff" />
    </Svg>
  );
}

/** Absolute-fill gradient background (CSS linear-gradient / radial-gradient stand-in). */
export function Grad({ stops, angle = 120, radial }: { stops: [string, number][]; angle?: number; radial?: { cx: string; cy: string; r: string; color: string; opacity?: number }[] }) {
  const [id] = useState(() => `g${++coinN}`);
  const rad = (angle - 90) * (Math.PI / 180);
  const x1 = 0.5 - Math.cos(rad) / 2, y1 = 0.5 - Math.sin(rad) / 2, x2 = 0.5 + Math.cos(rad) / 2, y2 = 0.5 + Math.sin(rad) / 2;
  return (
    <Svg style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>{stops.map(([c, o], i) => <Stop key={i} offset={o} stopColor={c} />)}</LinearGradient>
        {(radial ?? []).map((r, i) => <RadialGradient key={i} id={`${id}r${i}`} cx={r.cx} cy={r.cy} rx={r.r} ry={r.r} fx={r.cx} fy={r.cy}><Stop offset={0} stopColor={r.color} stopOpacity={r.opacity ?? 0.8} /><Stop offset={1} stopColor={r.color} stopOpacity={0} /></RadialGradient>)}
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      {(radial ?? []).map((_, i) => <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#${id}r${i})`} />)}
    </Svg>
  );
}
