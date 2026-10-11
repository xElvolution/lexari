/** Landing page art (lexari.ai), ported to React Native: the hanging hero ID badge (shared/components/Badge.tsx),
 * the finale face row (landing/components/Finale.tsx), the desk brief screen (Desk.tsx) and a roster card (Roster.tsx). Same faces, colours and words. */
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, TextInput, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import AgentFace from "./AgentFace";
import type { ColorKey } from "./avatar";
import { F, GRAPE, Label, T } from "@/web/kit";

export const BADGE = { company: "LEXARI", role: "Home agent", seat: "Seat 01", since: "Started today", inputLabel: "Name your agent", defaultName: "Juniper", hint: "Tap to flip. Drag to swing. Type a name." };

function Barcode({ text, w }: { text: string; w: number }) {
  const bars: number[] = [];
  for (const ch of (text || "lexari").padEnd(10, "x")) { const c = ch.charCodeAt(0); bars.push(1 + (c % 3), 1 + ((c >> 2) % 2)); }
  const total = bars.reduce((a, b) => a + b + 1, 0); let x = 0;
  return <Svg width={w} height={32} viewBox={`0 0 ${total} 20`} preserveAspectRatio="none">{bars.map((b, i) => { const r = <Rect key={i} x={x} y={0} width={i % 2 ? 0.6 : b} height={20} fill="#0a0a0a" />; x += b + 1; return r; })}</Svg>;
}

/** The hero badge on its lanyard. It sways on its own and swings when dragged, like the landing page. */
export function HeroBadge({ name, setName, width = 250, faceSize = 112 }: { name: string; setName?: (v: string) => void; width?: number; faceSize?: number }) {
  const a = useRef(new Animated.Value(7)).current;
  const [drag, setDrag] = useState(false);
  useEffect(() => {
    if (drag) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: -4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 4, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    Animated.spring(a, { toValue: 4, useNativeDriver: true, friction: 3 }).start(() => loop.start());
    return () => loop.stop();
  }, [drag, a]);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
    onPanResponderGrant: () => setDrag(true),
    onPanResponderMove: (_, g) => a.setValue(Math.max(-40, Math.min(40, -g.dx / 6))),
    onPanResponderRelease: () => setDrag(false),
  })).current;
  const rot = a.interpolate({ inputRange: [-40, 40], outputRange: ["-40deg", "40deg"] });
  const shown = name || "Your agent";
  const strap = 84;
  return (
    <Animated.View {...pan.panHandlers} style={{ alignItems: "center", transform: [{ translateY: -(strap + 200) }, { rotate: rot }, { translateY: strap + 200 }] }}>
      <View style={{ width: 30, height: strap, backgroundColor: GRAPE, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, alignItems: "center", justifyContent: "center" }}>
        <Label s={8} c="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: "90deg" }], width: 60, textAlign: "center" }}>lexari</Label>
      </View>
      <View style={{ zIndex: 2, marginTop: -4, width: 48, height: 28, borderRadius: 6, backgroundColor: "#d4d4d4", alignItems: "center", justifyContent: "center" }}><View style={{ width: 24, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.4)" }} /></View>
      <View style={{ marginTop: -8, width, borderRadius: 26, backgroundColor: "#fff", padding: 12, shadowColor: "#140050", shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 30 }, elevation: 12 }}>
        <View style={{ alignSelf: "center", marginBottom: 8, width: 64, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <View style={{ borderRadius: 18, backgroundColor: GRAPE, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}>
          <T f="display" s={26} c="#fff" style={{ lineHeight: 28 }}>HELLO</T>
          <Label s={9.5} c="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>my name is</Label>
        </View>
        <View style={{ marginTop: 12, height: 118, borderRadius: 18, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <AgentFace size={faceSize} animated />
          <Label s={9} c="rgba(255,255,255,0.7)" style={{ position: "absolute", left: 12, top: 12 }}>{BADGE.company}</Label>
          <View style={{ position: "absolute", right: 12, top: 10, borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={9} c="#fff">● online</Label></View>
        </View>
        <View style={{ paddingHorizontal: 6, paddingTop: 12 }}>
          <T f="display" s={40} c="#0a0a0a" lines={1} style={{ lineHeight: 42, letterSpacing: -1.6 }}>{shown}</T>
          <Label s={9.5} c="rgba(0,0,0,0.6)" style={{ marginTop: 8 }}>{`${BADGE.role} · ${BADGE.seat} · ${BADGE.since}`}</Label>
          <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(91,43,255,0.4)", paddingHorizontal: 12, paddingVertical: 8 }}>
            <Label s={8.5} c={GRAPE}>{BADGE.inputLabel}</Label>
            <TextInput value={name} editable={!!setName} maxLength={12} onChangeText={(v) => setName?.(v.replace(/[^\p{L}\p{N} ._-]/gu, ""))} accessibilityLabel={BADGE.inputLabel} style={{ color: "#0a0a0a", fontSize: 16, fontFamily: F.bold, padding: 0 }} />
          </View>
          <View style={{ marginTop: 12 }}><Barcode text={name} w={width - 36} /></View>
        </View>
      </View>
    </Animated.View>
  );
}

/** The five tilted faces from the landing finale. */
export const FINALE: [ColorKey, number][] = [["orange", 101], ["yellow", 7], ["teal", 45], ["pink", 23], ["sky", 88]];
export function FaceRow({ size = 84 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {FINALE.map(([color, seed], i) => <View key={seed} style={{ marginLeft: i ? -8 : 0, transform: [{ rotate: `${(i - 2) * 7}deg` }] }}><AgentFace seed={seed} variant={{ color }} size={size} animated={i === 2} /></View>)}
    </View>
  );
}

/** Desk: the "brief" screen of the landing desk (a job arrives, the agent answers). */
export function DeskBrief({ width }: { width: number }) {
  return (
    <View style={{ width, borderRadius: 24, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
      <View style={{ flexDirection: "row", gap: 6, padding: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>{["#ff5f57", "#febc2e", "#28c840"].map((c) => <View key={c} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c }} />)}</View>
      <View style={{ padding: 16 }}>
        <View style={{ alignSelf: "flex-end", maxWidth: "80%", borderRadius: 16, borderBottomRightRadius: 6, backgroundColor: GRAPE, padding: 12 }}><T f="semi" s={13} c="#fff">Compare three budgeting tools. Keep it to one page.</T></View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <AgentFace size={40} animated state="speaking" />
          <View style={{ maxWidth: "75%", borderRadius: 16, borderBottomLeftRadius: 6, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}><T s={13} c="#fff">On it. Opening my browser now.</T></View>
        </View>
        <Label s={9} c="rgba(255,255,255,0.4)" style={{ marginTop: 16 }}>job received · 09:00</Label>
      </View>
    </View>
  );
}

const ROSTER_COLORS: ColorKey[] = ["orange", "blue", "green", "yellow", "red", "teal", "pink", "sky"];
export const ROSTER_CARDS = [
  { name: "Scout", quip: "I read so you do not have to.", job: "Web research", rating: 4.9, jobs: 1840 },
  { name: "Quill", quip: "Give me a rough idea. I will give it back sharp.", job: "Writing and edits", rating: 4.8, jobs: 1322 },
  { name: "Tally", quip: "Messy sheet? Send it over.", job: "Numbers and sheets", rating: 4.8, jobs: 976 },
];
/** A roster card from the landing marketplace section (front side). */
export function RosterCard({ i, width = 250, onPress }: { i: number; width?: number; onPress?: () => void }) {
  const a = ROSTER_CARDS[i];
  return (
    <Pressable onPress={onPress} style={{ width, borderRadius: 28, backgroundColor: "#13101f", overflow: "hidden", shadowColor: "#3514b0", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 10 }, borderBottomWidth: 10, borderBottomColor: "#3514b0" }}>
      <View style={{ height: 160, backgroundColor: "#1c1533", alignItems: "center", justifyContent: "center" }}>
        <AgentFace seed={i * 11 + 5} variant={{ color: ROSTER_COLORS[i] }} size={128} animated={i === 0} />
        <T f="display" s={24} c="rgba(255,255,255,0.3)" style={{ position: "absolute", left: 16, top: 10 }}>{`#${String(i + 1).padStart(2, "0")}`}</T>
        <View style={{ position: "absolute", right: 16, top: 14, borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 4 }}><Label s={9} c="#0a0a0a">{`★ ${a.rating}`}</Label></View>
      </View>
      <View style={{ padding: 18 }}>
        <T f="display" s={38} c="#fff" style={{ letterSpacing: -1.5, lineHeight: 40 }}>{a.name}</T>
        <T f="semi" s={15} c="#a58bff" style={{ marginTop: 2 }}>{a.job}</T>
        <View style={{ marginTop: 12, borderRadius: 16, borderTopLeftRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#0b0915", paddingHorizontal: 14, paddingVertical: 10 }}><T f="semi" s={14} c="#fff">{`“${a.quip}”`}</T></View>
        <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 2, borderStyle: "dashed", borderTopColor: "rgba(255,255,255,0.1)", paddingTop: 12 }}>
          <T s={13} c="rgba(255,255,255,0.65)"><T f="bold" s={13} c="#fff">{a.jobs.toLocaleString("en-US")}</T> jobs done</T>
          <View style={{ borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 10, paddingVertical: 6 }}><Label s={9} c="#fff">flip ↻</Label></View>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------- landing sections for onboarding (landing/content/copy.ts, exact wording) ---------- */
export const COPY = {
  hero: { title: ["Meet your first", "personalized AI agent."], subtitle: "And hire more.", body: "Lexari gives you a personalized AI agent with a name, its own computer and a memory that lasts. It shows up every day, remembers how you like things done, and brings in specialists when the job gets bigger than one desk." },
  desk: { label: "01 · Its own desk", title: "It clocks in to a real computer.", body: "Your agent is not a chat window that forgets you when the tab closes. It has a persistent computer with a terminal, a browser and a folder of files. It opens pages, runs tools and saves the results where you can find them.", shiftTitle: "First shift, as it happens",
    shift: [
      { time: "09:00", head: "Reads the brief", text: "You write one line: compare three budgeting tools and keep it to one page.", screen: "brief" },
      { time: "09:04", head: "Opens the browser", text: "It visits each tool's feature page and reads them properly, tables included.", screen: "browser" },
      { time: "09:11", head: "Works in the terminal", text: "It pulls the numbers together and writes a draft on its own disk.", screen: "terminal" },
      { time: "09:15", head: "Hands you the files", text: "A one page summary and a spreadsheet land in its folder, ready to download.", screen: "files" },
    ],
    terminal: ["$ collect features --sites 3", "  3 pages read, 14 plans found", "$ build table --out plans.csv", "  plans.csv saved", "$ write summary --max 1page", "  summary.md saved, 380 words"],
    files: [{ name: "summary.md", size: "4 KB" }, { name: "plans.csv", size: "2 KB" }, { name: "sources.txt", size: "1 KB" }] },
  memory: { label: "02 · Memory", title: "It remembers, so you stop repeating yourself.", body: "Every job leaves something useful behind: how you like things written, which tools you use, who is on your team. Your agent files those notes and reads them before the next job, so each one starts further ahead than the last.", counterLabel: "notes filed after a month", counter: 212,
    cards: [{ tag: "Style", text: "Keeps summaries to one page" }, { tag: "Tools", text: "Prefers tables over long text" }, { tag: "Team", text: "Maya signs off on design" }, { tag: "Habit", text: "Weekly report goes out on Friday" }] },
  roster: { label: "03 · The roster", title: "Need a specialist? Hire one into a seat." , body: "The marketplace is a roster of specialist agents, each good at one kind of work. Every card shows what the agent does, how it has been rated and how many jobs it has finished. Hire one and it joins your team, next to your own agent." },
  seats: { label: "04 · Seats", title: "Pick the size of your team floor.", body: "A seat is one desk for one agent. Your own agent always sits at desk one and never gets replaced. Every other desk is an open seat for a specialist you hire from the roster.", legend: { home: "Your agent", hired: "Hired specialist", open: "Open seat" } },
};

/** The dark landing floor: black, grape glows and the office "carpet" dots. */
export function LandingBg({ width, height, grape = false }: { width: number; height: number; grape?: boolean }) {
  const cols = Math.ceil(width / 22), rows = Math.ceil(height / 22);
  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id="lg1" cx="85%" cy="18%" rx="75%" ry="40%"><Stop offset="0" stopColor="#5b2bff" stopOpacity={grape ? 0.85 : 0.55} /><Stop offset="1" stopColor="#5b2bff" stopOpacity="0" /></RadialGradient>
        <RadialGradient id="lg2" cx="0%" cy="55%" rx="70%" ry="35%"><Stop offset="0" stopColor="#5b2bff" stopOpacity={grape ? 0.6 : 0.35} /><Stop offset="1" stopColor="#5b2bff" stopOpacity="0" /></RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="#000" />
      <Rect width={width} height={height} fill="url(#lg1)" />
      <Rect width={width} height={height} fill="url(#lg2)" />
      {Array.from({ length: rows }).map((_, y) => Array.from({ length: cols }).map((__, x) => <Circle key={`${x}-${y}`} cx={x * 22 + 1} cy={y * 22 + 1} r={1} fill="rgba(255,255,255,0.12)" />))}
    </Svg>
  );
}
export function SectionLabel({ children }: { children: string }) {
  return <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 12, paddingVertical: 6 }}><Label s={11} c="#fff">{children}</Label></View>;
}
export function Display({ children, s = 40, c = "#fff", style }: { children: React.ReactNode; s?: number; c?: string; style?: object }) {
  return <T f="display" s={s} c={c} style={{ letterSpacing: -s * 0.045, lineHeight: s * 0.98, ...style }}>{children}</T>;
}

/** The landing desk: the agent computer showing the four first-shift screens, with the timeline step under it. */
export function DeskShift({ width }: { width: number }) {
  const D = COPY.desk;
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  useEffect(() => { const t = setInterval(() => setStep((s) => (s + 1) % 4), 3200); return () => clearInterval(t); }, []);
  useEffect(() => { if (step !== 2) return; setTyped(0); const t = setInterval(() => setTyped((v) => v + 3), 40); return () => clearInterval(t); }, [step]);
  const s = D.shift[step];
  let left = typed;
  return (
    <View style={{ width }}>
      <View style={{ borderRadius: 26, backgroundColor: "#1c1730", padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", shadowColor: "#5b2bff", shadowOpacity: 0.5, shadowRadius: 40, shadowOffset: { width: 0, height: 20 } }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>{[GRAPE, "#c9b8ff", "rgba(255,255,255,0.6)"].map((c) => <View key={c} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />)}</View>
          <Label s={9} c="rgba(255,255,255,0.55)">agent computer · online</Label>
          <Label s={9} c="#c9b8ff">{s.time}</Label>
        </View>
        <View style={{ height: 196, borderRadius: 18, backgroundColor: "#07050e", padding: 16, overflow: "hidden" }}>
          {s.screen === "brief" ? (
            <>
              <View style={{ alignSelf: "flex-end", maxWidth: "80%", borderRadius: 16, borderBottomRightRadius: 6, backgroundColor: GRAPE, padding: 12 }}><T f="semi" s={13} c="#fff">Compare three budgeting tools. Keep it to one page.</T></View>
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 }}><AgentFace size={40} animated state="speaking" /><View style={{ maxWidth: "75%", borderRadius: 16, borderBottomLeftRadius: 6, backgroundColor: "rgba(255,255,255,0.1)", padding: 12 }}><T s={13} c="#fff">On it. Opening my browser now.</T></View></View>
              <Label s={9} c="rgba(255,255,255,0.4)" style={{ marginTop: 14 }}>job received · 09:00</Label>
            </>
          ) : s.screen === "browser" ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#c9b8ff" }} /><T f="mono" s={10} c="rgba(255,255,255,0.7)">features.budgetapp.example</T></View>
              <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                {["Basic", "Plus", "Team"].map((p, i) => (
                  <View key={p} style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: i === 1 ? GRAPE : "rgba(255,255,255,0.08)", borderWidth: i === 1 ? 0 : 1, borderColor: "rgba(255,255,255,0.1)" }}>
                    <T f="bold" s={11} c="#fff">{p}</T><Display s={18} style={{ marginTop: 4 }}>{["7.4", "8.9", "8.1"][i]}</Display>
                    {[0, 1, 2].map((q) => <View key={q} style={{ marginTop: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", width: `${90 - q * 18}%` }} />)}
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 12, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4 }}><Label s={9} c="#0a0a0a">reading table 2 of 3</Label></View>
            </>
          ) : s.screen === "terminal" ? (
            <View>{D.terminal.map((l, i) => { const t = l.slice(0, Math.max(0, left)); left -= l.length; return t ? <T key={i} f="mono" s={11} c={l.startsWith("$") ? "#fff" : "#c9b8ff"} style={{ lineHeight: 21 }}>{t}</T> : null; })}</View>
          ) : (
            <>
              <Label s={9} c="rgba(255,255,255,0.5)">~/output</Label>
              <View style={{ marginTop: 12, gap: 8 }}>{D.files.map((f) => (
                <View key={f.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <View style={{ width: 28, height: 32, borderRadius: 6, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center" }}><T f="bold" s={9} c="#fff">{f.name.split(".")[1]}</T></View>
                  <T f="mono" s={11} c="#fff" style={{ flex: 1 }}>{f.name}</T><T s={11} c="rgba(255,255,255,0.5)">{f.size}</T>
                </View>
              ))}</View>
            </>
          )}
        </View>
      </View>
      <View style={{ alignSelf: "center", width: 96, height: 16, backgroundColor: "#1c1730" }} /><View style={{ alignSelf: "center", width: 176, height: 10, borderRadius: 5, backgroundColor: "#1c1730" }} />
      <Label s={11} c="#a58bff" style={{ marginTop: 18 }}>{D.shiftTitle}</Label>
      <View style={{ marginTop: 10, flexDirection: "row", gap: 14, borderLeftWidth: 4, borderLeftColor: "#a58bff", paddingLeft: 16, paddingVertical: 4 }}>
        <Display s={26} c="#a58bff">{s.time}</Display>
        <View style={{ flex: 1 }}><Display s={24}>{s.head}</Display><T s={14} c="rgba(255,255,255,0.75)" style={{ marginTop: 6, lineHeight: 20 }}>{s.text}</T></View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 12, paddingLeft: 20 }}>{D.shift.map((_, i) => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= step ? "#a58bff" : "#1d1731" }} />)}</View>
    </View>
  );
}

const TAGC: Record<string, string> = { Style: "#5b2bff", Tools: "#c9b8ff", Team: "#ffffff", Habit: "#8f6bff" };
const TILT = [-3, 2, -1.5, 3];
/** Memory: the count-up and the tilted notes, as on the landing page. */
export function MemoryNotes({ width }: { width: number }) {
  const M = COPY.memory;
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((v) => (v >= M.counter ? (clearInterval(t), v) : Math.min(M.counter, v + 7))), 30); return () => clearInterval(t); }, [M.counter]);
  const cw = (width - 12) / 2;
  return (
    <View style={{ width }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14 }}><Display s={84} c="#a58bff">{String(n)}</Display><T s={15} c="rgba(255,255,255,0.7)" style={{ paddingBottom: 14, flex: 1 }}>{M.counterLabel}</T></View>
      <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {M.cards.map((c, i) => (
          <View key={c.text} style={{ width: cw, borderRadius: 16, backgroundColor: "#13101f", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", padding: 14, paddingTop: 18, transform: [{ rotate: `${TILT[i]}deg` }], overflow: "hidden" }}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, backgroundColor: TAGC[c.tag] }} />
            <View style={{ position: "absolute", right: 14, top: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)" }} />
            <Label s={9.5} c="rgba(255,255,255,0.55)">{`note ${String(i + 1).padStart(3, "0")} · ${c.tag}`}</Label>
            <Display s={19} style={{ marginTop: 8, lineHeight: 19.5 }}>{c.text}</Display>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Seats: the Pro floor plan (5 desks, your agent at desk one) with its legend. */
export function FloorPlan({ width }: { width: number }) {
  const L = COPY.seats.legend;
  const cell = (width - 32 - 4 * 8) / 5;
  const [taken, setTaken] = useState(1);
  useEffect(() => { const t = setInterval(() => setTaken((v) => (v >= 3 ? 1 : v + 1)), 1400); return () => clearInterval(t); }, []);
  return (
    <View style={{ width }}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {([["Free", 1], ["Pro", 5], ["Pro Plus", 20], ["Max", 100]] as const).map(([n, s]) => <View key={n} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: n === "Pro" ? GRAPE : "#1d1731", ...(n === "Pro" ? { borderBottomWidth: 4, borderBottomColor: "#3514b0" } : null) }}><T f="bold" s={14} c="#fff">{n} <T s={14} c="rgba(255,255,255,0.6)">{String(s)}</T></T></View>)}
      </View>
      <View style={{ borderRadius: 30, backgroundColor: "#13101f", borderWidth: 2, borderColor: "#1d1731", padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Label s={11} c="rgba(255,255,255,0.6)">floor plan · Pro</Label><Label s={11} c="#a58bff">{`${taken} / 5 desks`}</Label></View>
        <View style={{ marginTop: 18, flexDirection: "row", gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const st = i === 0 ? "home" : i < taken ? "hired" : "open";
            return (
              <View key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.22, alignItems: "center", justifyContent: "center", backgroundColor: st === "home" ? GRAPE : st === "hired" ? "#1d1731" : "rgba(0,0,0,0.6)", borderWidth: 2, borderStyle: st === "open" ? "dashed" : "solid", borderColor: st === "home" ? GRAPE : st === "hired" ? "rgba(91,43,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                {st === "home" ? <AgentFace size={cell * 0.74} animated /> : st === "hired" ? <AgentFace seed={i * 7 + 3} size={cell * 0.74} /> : <T s={22} c="rgba(255,255,255,0.25)">+</T>}
              </View>
            );
          })}
        </View>
        <View style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {([[L.home, { backgroundColor: GRAPE }], [L.hired, { backgroundColor: "#1d1731", borderWidth: 2, borderColor: "rgba(91,43,255,0.45)" }], [L.open, { borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.25)" }]] as const).map(([l, st]) => <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={[{ width: 14, height: 14, borderRadius: 4 }, st]} /><T s={13} c="rgba(255,255,255,0.7)">{l}</T></View>)}
        </View>
      </View>
    </View>
  );
}

/** Roster: two landing roster cards fanned out. */
export function RosterFan({ width }: { width: number }) {
  return (
    <View style={{ width, height: 400 }}>
      <View style={{ position: "absolute", left: width / 2 - 30, top: 30, opacity: 0.6, transform: [{ rotate: "6deg" }] }}><RosterCard i={1} width={220} /></View>
      <View style={{ position: "absolute", left: width / 2 - 200, top: 0, transform: [{ rotate: "-4deg" }] }}><RosterCard i={0} width={240} /></View>
    </View>
  );
}

/** Hero title block: "Meet your first / personalized AI agent. / And hire more. ↗" */
export function HeroTitle({ s = 46 }: { s?: number }) {
  return (
    <View>
      <Display s={s}>{COPY.hero.title[0]}</Display>
      <Display s={s} c="#a58bff">{COPY.hero.title[1]}</Display>
      <Display s={s * 0.62} c="rgba(255,255,255,0.85)" style={{ marginTop: 10 }}>{`${COPY.hero.subtitle} `}<Display s={s * 0.62} c="#a58bff">↗</Display></Display>
    </View>
  );
}

/** The lexari wordmark as on the landing header (always on the dark floor). */
export function LandingLogo({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 * scale }}>
      <View style={{ width: 25 * scale, height: 25 * scale, borderRadius: 8 * scale, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><View style={{ width: 9 * scale, height: 9 * scale, borderRadius: 5 * scale, backgroundColor: "#000" }} /></View>
      <T f="display" s={23 * scale} c="#fff" style={{ letterSpacing: -1 * scale }}>lexari</T>
    </View>
  );
}

/** The ID card that flips on tap (rotateY 180°) to its back: logo, details, barcode. Tap again to flip back. */
export function FlipIdCard({ name, width = 250, faceSize = 104 }: { name: string; width?: number; faceSize?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const [back, setBack] = useState(false);
  const flip = () => { const to = back ? 0 : 1; setBack(!back); Animated.spring(v, { toValue: to, friction: 7, tension: 40, useNativeDriver: true }).start(); };
  const front = v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const rear = v.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const shown = name || "Your agent";
  const face: object = { width, borderRadius: 26, backgroundColor: "#fff", padding: 12, backfaceVisibility: "hidden", shadowColor: "#140050", shadowOpacity: 0.55, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 12 };
  return (
    <Pressable onPress={flip} accessibilityLabel={back ? "Flip the card back" : "Flip the card"}>
      <Animated.View style={[face, { transform: [{ perspective: 1000 }, { rotateY: front }] }]}>
        <View style={{ alignSelf: "center", marginBottom: 8, width: 64, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <View style={{ borderRadius: 18, backgroundColor: GRAPE, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" }}>
          <T f="display" s={24} c="#fff" style={{ lineHeight: 26 }}>HELLO</T>
          <Label s={9.5} c="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>my name is</Label>
        </View>
        <View style={{ marginTop: 10, height: 112, borderRadius: 18, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <AgentFace size={faceSize} animated />
          <Label s={9} c="rgba(255,255,255,0.7)" style={{ position: "absolute", left: 12, top: 12 }}>{BADGE.company}</Label>
          <View style={{ position: "absolute", right: 12, top: 10, borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={9} c="#fff">● online</Label></View>
        </View>
        <View style={{ paddingHorizontal: 6, paddingTop: 10 }}>
          <T f="display" s={34} c="#0a0a0a" lines={1} style={{ lineHeight: 36, letterSpacing: -1.4 }}>{shown}</T>
          <Label s={9.5} c="rgba(0,0,0,0.6)" style={{ marginTop: 6 }}>{`${BADGE.role} · ${BADGE.seat} · ${BADGE.since}`}</Label>
          <View style={{ marginTop: 10 }}><Barcode text={name} w={width - 36} /></View>
        </View>
      </Animated.View>
      <Animated.View style={[face, { position: "absolute", left: 0, top: 0, bottom: 0, padding: 0, overflow: "hidden", transform: [{ perspective: 1000 }, { rotateY: rear }] }]}>
        <View style={{ alignSelf: "center", marginTop: 12, width: 64, height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.1)" }} />
        <View style={{ marginTop: 12, height: 44, backgroundColor: "#0a0a0a" }} />
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Svg width={22} height={22} viewBox="0 0 64 64"><Rect width={64} height={64} rx={15} fill={GRAPE} /><Ellipse cx={22} cy={26} rx={6} ry={8.5} fill="#fff" /><Ellipse cx={42} cy={26} rx={6} ry={8.5} fill="#fff" /><Path d="M20 41 Q32 51.5 44 41" fill="none" stroke="#fff" strokeWidth={5.5} strokeLinecap="round" /></Svg>
              <T f="display" s={18} c="#0a0a0a" style={{ letterSpacing: -0.6 }}>lexari</T>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: GRAPE, paddingHorizontal: 8, paddingVertical: 4 }}><Label s={8.5} c="#fff">{BACK.kind}</Label></View>
          </View>
          <Label s={8.5} c="rgba(0,0,0,0.5)" style={{ marginTop: 12 }}>{BACK.holder}</Label>
          <T f="display" s={26} c="#0a0a0a" lines={1} style={{ lineHeight: 30, flexShrink: 0, minHeight: 30 }}>{shown}</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6, rowGap: 8, flexShrink: 0 }}>
            {[...BACK.fields, [BACK.issuedLabel, "Day one"] as [string, string]].map(([k, val]) => <View key={k} style={{ width: "50%", paddingRight: 6 }}><Label s={8.5} c="rgba(0,0,0,0.5)">{k}</Label><T f="semi" s={12} c="#0a0a0a" style={{ lineHeight: 15 }}>{val}</T></View>)}
          </View>
          <View style={{ marginTop: "auto", flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
            <View style={{ width: 56, height: 56, borderRadius: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", padding: 4 }}><Code text={shown} /></View>
            <View style={{ flex: 1 }}>
              <View style={{ borderBottomWidth: 2, borderBottomColor: "rgba(0,0,0,0.7)", paddingBottom: 2 }}><T f="display" s={18} c={GRAPE} style={{ fontStyle: "italic" }} lines={1}>{shown}</T></View>
              <Label s={8} c="rgba(0,0,0,0.5)" style={{ marginTop: 4 }}>{BACK.sign}</Label>
            </View>
          </View>
          <T s={9.5} c="rgba(0,0,0,0.55)" style={{ marginTop: 10, lineHeight: 13 }}>{BACK.fine}</T>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const BACK = {
  kind: "Agent ID", holder: "Card holder",
  fields: [["Role", "Home agent"], ["Access", "Owner · Seat 01"], ["Computer", "Its own, always on"], ["Memory", "Remembers you"], ["Team", "Can hire more"]] as [string, string][],
  issuedLabel: "Issued", sign: "Agent signature",
  fine: "Property of Lexari. If found, please return to Lexari. Not valid for real doors.",
};
/** A small square code (like the landing badge back), seeded by the name. */
function Code({ text }: { text: string }) {
  const n = 11; let h = 2166136261; for (const ch of text || "lexari") h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { h = Math.imul(h ^ (x * 31 + y), 16777619); const fin = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7); if (fin ? !(x % 10 === 1 && y % 10 === 1) && (x % 10 !== 1 || y % 10 !== 1) : (h >>> 28) & 1) cells.push([x, y]); }
  return <Svg width="100%" height="100%" viewBox={`0 0 ${n} ${n}`}>{cells.map(([x, y]) => <Rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0a0a0a" />)}</Svg>;
}
