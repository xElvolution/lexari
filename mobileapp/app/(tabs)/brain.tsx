/** Port of webapp/components/brain/Brain.tsx: the turning point-cloud brain (same geometry and area colours as scene.ts), area labels with counts, swipe between agents, and the area panel. */
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, Share, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Polyline } from "react-native-svg";
import Icon from "@/components/Icon";
import { ROSTER } from "@/content/roster";
import { AgentTile, F, GRAPE, Label, T, useC } from "@/web/kit";
import { useData } from "@/web/data";

const CATS = [
  { id: "About you", anchor: [0, 0.6, 0.72], dark: "#d9ccff", light: "#5b2bff" },
  { id: "Preferences", anchor: [-0.55, 0.22, 0.55], dark: "#a78bfa", light: "#6d28d9" },
  { id: "People", anchor: [0.64, -0.08, 0.12], dark: "#93c5fd", light: "#1d4ed8" },
  { id: "Tools", anchor: [-0.46, 0.62, -0.22], dark: "#818cf8", light: "#4338ca" },
  { id: "Habits", anchor: [0.05, 0.32, -0.96], dark: "#e9d5ff", light: "#7e22ce" },
  { id: "Files", anchor: [-0.64, -0.16, -0.08], dark: "#ffffff", light: "#0a0a0a" },
  { id: "Hired agents", anchor: [0, -0.46, -0.72], dark: "#c084fc", light: "#a21caf" },
  { id: "Skills", anchor: [0.52, 0.5, -0.42], dark: "#7dd3fc", light: "#0369a1" },
] as const;
const EDITABLE = new Set(["About you", "Preferences", "People", "Tools", "Habits"]);
const BLURB: Record<string, string> = {
  "About you": "Who you are and how you like to be addressed.", Preferences: "How you like work done and delivered.", People: "Who is on your team and what they own.",
  Tools: "The apps and formats you use.", Habits: "Your routines and deadlines.", Files: "Outputs your agent saved from finished jobs.",
  "Hired agents": "Specialists working in your seats.", Skills: "What this agent can do.",
};
const SKILLS: Record<string, string> = { web: "Web browsing", files: "Files", code: "Code", calendar: "Calendar" };
const RINGS = [{ r: 2.35, rot: [1.33, 0.12, 0.05] }, { r: 2.0, rot: [0.95, -0.62, 0.32] }, { r: 1.72, rot: [0.3, 0.95, -0.2] }];

const fold = (x: number, y: number, z: number) => 0.5 * Math.sin(10 * z + 3 * Math.sin(6 * y)) + 0.5 * Math.sin(9 * y + 3 * Math.sin(7 * x + 4 * z));
function brainPoints(n: number) {
  const out: { x: number; y: number; z: number; r: number; s: number }[] = [];
  let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (out.length < n) {
    const u = rand(); let x: number, y: number, z: number;
    if (u < 0.84) {
      const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
      const dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th);
      const f = fold(dx, dy, dz); if (f < -0.15 && rand() < 0.88) continue;
      const side = dx >= 0 ? 1 : -1, r = 1 + 0.1 * f;
      x = side * 0.07 + dx * 0.56 * r; y = dy * 0.7 * r; z = dz * 1.12 * r;
      if (z > 0.2) y *= 1 - (z - 0.2) * 0.18; if (y < -0.32) y = -0.32 + (y + 0.32) * 0.45; if (Math.abs(x) < 0.1) x = side * (0.1 + rand() * 0.03);
    } else if (u < 0.95) {
      const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
      x = Math.sin(ph) * Math.cos(th) * 0.5; y = -0.44 + Math.cos(ph) * 0.22; z = -0.7 + Math.sin(ph) * Math.sin(th) * 0.3;
    } else { const t = rand(), a = rand() * Math.PI * 2, rr = 0.11 - t * 0.03; x = Math.cos(a) * rr; y = -0.3 - t * 0.78; z = -0.32 - t * 0.2 + Math.sin(a) * rr; }
    let best = 0, bd = Infinity; CATS.forEach((c, k) => { const d = (c.anchor[0] - x) ** 2 + (c.anchor[1] - y) ** 2 + (c.anchor[2] - z) ** 2; if (d < bd) { bd = d; best = k; } });
    out.push({ x, y, z, r: best, s: 0.6 + rand() * 0.9 });
  }
  return out;
}
const rotY = (x: number, z: number, a: number) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
function ringPts(r: number, rot: readonly number[]) {
  const pts: number[][] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2; let x = Math.cos(t) * r, y = Math.sin(t) * r, z = 0;
    const [a, b, c] = rot;
    [y, z] = [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
    [x, z] = [x * Math.cos(b) + z * Math.sin(b), -x * Math.sin(b) + z * Math.cos(b)];
    [x, y] = [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c)];
    pts.push([x / 2.4, y / 2.4, z / 2.4]);
  }
  return pts;
}

export default function Brain() {
  const k = useC();
  const { me } = useData();
  const { width, height } = useWindowDimensions();
  const pts = useMemo(() => brainPoints(1000), []);
  const rings = useMemo(() => RINGS.map((r) => ringPts(r.r, r.rot)), []);
  const [yaw, setYaw] = useState(0.6);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const yawRef = useRef(yaw); yawRef.current = yaw;
  const [focus, setFocus] = useState(-1);
  const list = (me?.agents ?? []).filter((a) => a.kind === "home" || a.kind === "custom");
  const [at, setAt] = useState(0);
  const who = list[at] ?? list[0];
  useEffect(() => { let raf = 0, last = 0; const loop = (t: number) => { raf = requestAnimationFrame(loop); if (t - last < 60 || drag.current) return; last = t; setYaw((y) => y + 0.012); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, []);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
    onPanResponderGrant: () => { drag.current = { x: 0, yaw: yawRef.current }; },
    onPanResponderMove: (_, g) => { if (drag.current) setYaw(drag.current.yaw + g.dx / 120); },
    onPanResponderRelease: () => { drag.current = null; },
  }), []);
  const mem = (me?.memories ?? []).filter((m) => ((m as { agent?: string }).agent || "home") === (who?.slug ?? "home"));
  const hired = (me?.agents ?? []).filter((a) => a.kind === "hired");
  const skills = who?.slug === "home" ? (who.skills?.length ? who.skills : ["web", "files", "code", "calendar"]) : who?.skills ?? [];
  const fileList = (me?.jobs ?? []).map((j, i) => ({ j, i })).filter(({ j }) => j.status !== "running" && (j.assignee || "home") === (who?.slug ?? "home") && j.output).map(({ j, i }) => {
    const title = j.title || j.prompt.slice(0, 80);
    const name = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "output"}.md`;
    const body = `# ${title}\n\nAsked: ${j.prompt}\n\n${j.output}\n`;
    return { name, job: i + 1, size: `${Math.max(1, Math.round(body.length / 1024))} KB`, body };
  });
  const files = fileList.length;
  const count = (id: string) => (id === "Files" ? files : id === "Hired agents" ? hired.length : id === "Skills" ? skills.length : mem.filter((m) => (m as { tag?: string }).tag === id).length);
  const stageH = height - 56 - 66 - 40;
  const cx = width / 2, cy = stageH * 0.58, S = Math.min(width, stageH) * 0.95;
  const proj = (x: number, y: number, z: number) => { const [rx, rz] = rotY(x, z, yaw); const p = 2.6 / (2.6 - rz * 0.9); return { x: cx + rx * S * p * 0.62, y: cy - y * S * p * 0.62, z: rz, p }; };
  const col = (i: number) => (k.dark ? CATS[i].dark : CATS[i].light);
  const name = who?.name ?? "Your agent";

  return (
    <View style={{ flex: 1, overflow: "hidden" }} {...pan.panHandlers}>
      <Svg width={width} height={stageH + 40} style={{ position: "absolute", left: 0, top: 0 }}>
        {rings.map((r, i) => <Polyline key={i} points={r.map(([x, y, z]) => { const q = proj(x * 1.9, y * 1.9, z * 1.9); return `${q.x},${q.y}`; }).join(" ")} fill="none" stroke={k.dark ? "rgba(201,184,255,0.22)" : "rgba(91,43,255,0.2)"} strokeWidth={1} />)}
        {pts.map((p, i) => { const q = proj(p.x, p.y, p.z); const hot = focus < 0 || focus === p.r; return <Circle key={i} cx={q.x} cy={q.y} r={p.s * q.p * 0.95} fill={col(p.r)} opacity={(hot ? 0.35 : 0.08) + (q.z + 1.1) * (hot ? 0.28 : 0.04)} />; })}
      </Svg>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 20, right: 20, top: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GRAPE }} /><Label>Memory</Label></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
          {list.length > 1 ? <Pressable accessibilityLabel="Previous agent's brain" onPress={() => setAt((at - 1 + list.length) % list.length)}><Icon name="left" size={14} color={k.ink45} /></Pressable> : null}
          <T f="display" s={25} style={{ letterSpacing: -1.1 }}>{`${name}'s brain`}</T>
          {list.length > 1 ? <Pressable accessibilityLabel="Next agent's brain" onPress={() => setAt((at + 1) % list.length)}><Icon name="right" size={14} color={k.ink45} /></Pressable> : null}
        </View>
        <T s={14} c={k.ink75} style={{ marginTop: 8 }}><T f="bold" s={14}>{String(mem.length)}</T>{` memories in ${CATS.length - 1} areas`}</T>
        {list.length > 1 ? <Label s={8.5} c={k.ink45} style={{ marginTop: 6 }}>Swipe to switch agent</Label> : null}
      </View>

      {CATS.map((c, i) => { const q = proj(c.anchor[0] * 1.12, c.anchor[1] * 1.12, c.anchor[2] * 1.12); return (
        <Pressable key={c.id} onPress={() => setFocus(focus === i ? -1 : i)} style={{ position: "absolute", left: Math.max(6, Math.min(width - 150, q.x - 40)), top: q.y - 14, zIndex: q.z > 0 ? 3 : 2, opacity: q.z > -0.4 ? 1 : 0.55, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: k.dark ? "rgba(19,16,31,0.85)" : "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: k.line, paddingHorizontal: 10, paddingVertical: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: col(i) }} />
          <Label s={9} c={k.ink}>{c.id}</Label><Label s={9} c={k.ink45}>{String(count(c.id))}</Label>
        </Pressable>
      ); })}

      {focus < 0 ? <View pointerEvents="none" style={{ position: "absolute", bottom: 16, alignSelf: "center", borderRadius: 999, backgroundColor: k.dark ? "rgba(19,16,31,0.85)" : "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: k.line, paddingHorizontal: 14, paddingVertical: 8 }}><Label s={9.5} c={k.ink75}>Drag to turn · tap a label to open it</Label></View> : null}

      {focus >= 0 ? (() => { const c = CATS[focus]; const notes = mem.filter((m) => (m as { tag?: string }).tag === c.id); return (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, maxHeight: "64%", borderRadius: 26, backgroundColor: k.dark ? "rgba(19,16,31,0.95)" : "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: k.line, zIndex: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderBottomWidth: 1, borderBottomColor: k.line, padding: 18, paddingBottom: 14 }}>
            <View style={{ marginTop: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: col(focus), borderWidth: 3, borderColor: k.tint }} />
            <View style={{ flex: 1 }}><T f="display" s={26} style={{ letterSpacing: -1 }}>{c.id}</T><T s={14} c={k.ink75} style={{ marginTop: 6 }}>{BLURB[c.id]}</T></View>
            <Pressable accessibilityLabel="Close" onPress={() => setFocus(-1)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: k.tint, alignItems: "center", justifyContent: "center" }}><Icon name="x" size={16} color={k.ink} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
            {EDITABLE.has(c.id) ? (notes.length ? notes.map((n) => (
              <View key={(n as { id: string }).id} style={{ borderRadius: 16, backgroundColor: k.alt, borderWidth: 1, borderColor: k.line, padding: 14 }}>
                <T f="semi" s={15} c={k.ink45}>Encrypted. Open your memories to read it.</T>
                <Label s={9} c={k.ink60} style={{ marginTop: 6 }}>{`${(n as { source?: string }).source ?? "You"} · ${new Date((n as { at: number }).at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}</Label>
              </View>
            )) : <View style={{ borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: k.line, padding: 20 }}><T s={14} c={k.ink75} style={{ textAlign: "center" }}>{`Nothing here yet. Teach ${name} something below.`}</T></View>) : null}
            {c.id === "Files" && fileList.length ? fileList.map((f) => (
              <View key={`${f.job}-${f.name}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: k.alt, borderWidth: 1, borderColor: k.line, padding: 12 }}>
                <View style={{ width: 32, height: 36, borderRadius: 6, backgroundColor: GRAPE, alignItems: "center", justifyContent: "center" }}><T f="bold" s={9} c="#fff">MD</T></View>
                <View style={{ flex: 1 }}><T f="mono" s={13} lines={1}>{f.name}</T><Label s={9} c={k.ink60} style={{ marginTop: 4 }}>{`Job #${String(f.job).padStart(3, "0")} · ${f.size}`}</Label></View>
                <Pressable accessibilityLabel={`Download ${f.name}`} onPress={() => void Share.share({ title: f.name, message: f.body })} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}><Icon name="download" size={15} color={k.ink75} /></Pressable>
              </View>
            )) : null}
            {c.id === "Files" && !fileList.length ? <View style={{ borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: k.line, padding: 20 }}><T s={14} c={k.ink75} style={{ textAlign: "center" }}>No files yet. Finished jobs save them here.</T></View> : null}
            {c.id === "Skills" ? skills.map((s) => (
              <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: k.alt, borderWidth: 1, borderColor: k.line, padding: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: col(focus), alignItems: "center", justifyContent: "center" }}><Icon name="check" size={15} stroke={3} color={k.dark ? "#0a0a0a" : "#fff"} /></View>
                <T f="bold" s={15}>{SKILLS[s] ?? s}</T>
              </View>
            )) : null}
            {c.id === "Hired agents" ? (hired.length ? hired.map((h) => (
              <Pressable key={h.slug} onPress={() => router.push(`/marketplace/${h.slug}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, backgroundColor: k.alt, borderWidth: 1, borderColor: k.line, padding: 10 }}>
                <AgentTile slug={h.slug} size={44} dot={false} />
                <View style={{ flex: 1 }}><T f="bold" s={15}>{h.name}</T><T s={13} c={k.ink75}>{ROSTER.find((r) => r.slug === h.slug)?.job ?? h.role ?? ""}</T></View>
                <Icon name="arrow" size={16} color={k.ink60} />
              </Pressable>
            )) : <View style={{ borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: k.line, padding: 20 }}><T s={14} c={k.ink75} style={{ textAlign: "center" }}>No one hired yet.</T></View>) : null}
          </ScrollView>
        </View>
      ); })() : null}
      {void F}
    </View>
  );
}
