"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";

/**
 * The human self-serve studio: pick a template, fill a brief, choose options,
 * render. Launch Reel and Stat Clip render free (watermarked) instantly;
 * App Tour and clean 1080p are the paid path (wallet connect).
 */

type TemplateId = "launch-reel" | "stat-clip" | "app-tour";

const TEMPLATES: {
  id: TemplateId;
  name: string;
  price: string;
  blurb: string;
  color: string;
  free: boolean;
}[] = [
  { id: "launch-reel", name: "Launch Reel", price: "$5", blurb: "Cinematic product launch film", color: "#6C5CE7", free: true },
  { id: "stat-clip", name: "Stat Clip", price: "$2", blurb: "Animated data highlight", color: "#4ADEDE", free: true },
  { id: "app-tour", name: "App Tour", price: "$8", blurb: "Recorded walkthrough with a live cursor", color: "#FF7A59", free: false },
];

const VOICES = ["nova", "onyx", "shimmer"] as const;
const TONES = ["bold", "friendly", "technical"] as const;
const DURATIONS = [
  { id: "short", label: "Short · ≤40s" },
  { id: "standard", label: "Standard · ≤90s" },
  { id: "extended", label: "Extended · ≤3min" },
] as const;

export default function CreateStudio() {
  const [active, setActive] = useState<TemplateId>("launch-reel");
  const tpl = TEMPLATES.find((t) => t.id === active)!;

  return (
    <main className="min-h-screen bg-[#07070B] text-zinc-100">
      <SmoothScroll />
      <Cursor />
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-[#07070B]/80 px-6 py-4 backdrop-blur">
        <Link href="/" className="font-display text-lg font-bold">
          RenderReel
        </Link>
        <div className="text-sm text-zinc-500">Create studio</div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Make a video
        </h1>
        <p className="mt-2 text-zinc-400">
          Fill the brief, pick your look, render. No editor, no timeline.
        </p>

        {/* template tabs */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                active === t.id
                  ? "border-transparent ring-2"
                  : "border-white/10 hover:border-white/25"
              }`}
              style={active === t.id ? { boxShadow: `0 0 0 2px ${t.color}`, background: `${t.color}12` } : {}}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: active === t.id ? t.color : undefined }}>
                  {t.name}
                </span>
                <span className="text-sm text-zinc-500">{t.price}</span>
              </div>
              <div className="mt-1 text-sm text-zinc-400">{t.blurb}</div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.free ? "#4ADE80" : "#F5A623" }}>
                {t.free ? "Free demo available" : "Wallet required"}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {active === "launch-reel" && <LaunchReelForm color={tpl.color} />}
              {active === "stat-clip" && <StatClipForm color={tpl.color} />}
              {active === "app-tour" && <AppTourForm color={tpl.color} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-white/40 placeholder-zinc-600";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function SubmitBar({
  color,
  free,
  submitting,
  error,
  onSubmit,
}: {
  color: string;
  free: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-8">
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-2xl py-4 text-base font-semibold text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
        style={{ background: `linear-gradient(90deg, ${color}, #4ADEDE)` }}
      >
        {submitting
          ? "Queueing your render…"
          : free
            ? "Render free preview (720p, watermarked)"
            : "Connect wallet to render"}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-600">
        {free
          ? "Free previews are watermarked 720p. Clean 1080p is $2–8 per render, paid in USDT on X Layer."
          : "Paid via x402 — USDT on X Layer, gasless. Wallet connect ships with the deployed build."}
      </p>
    </div>
  );
}

function useDemoSubmit(template: TemplateId) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: unknown) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template, input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.issues
            ? data.issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join(" · ")
            : (data.message ?? data.error ?? "something went wrong"),
        );
        return;
      }
      router.push(`/jobs/${data.jobId}`);
    } catch {
      setError("network error — try again");
    } finally {
      setSubmitting(false);
    }
  }
  return { submit, submitting, error };
}

function LaunchReelForm({ color }: { color: string }) {
  const { submit, submitting, error } = useDemoSubmit("launch-reel");
  const [f, setF] = useState({
    productName: "",
    oneLiner: "",
    features: ["", "", ""],
    screenshot: "",
    brandColor: "#6C5CE7",
    voice: "nova",
    tone: "bold",
    duration: "short",
  });
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  const setFeature = (i: number, v: string) =>
    setF((s) => ({ ...s, features: s.features.map((x, j) => (j === i ? v : x)) }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name">
            <input className={inputCls} maxLength={40} value={f.productName} onChange={(e) => set("productName", e.target.value)} placeholder="Vaultline" />
          </Field>
          <Field label="Brand color">
            <div className="flex items-center gap-3">
              <input type="color" value={f.brandColor} onChange={(e) => set("brandColor", e.target.value)} className="h-12 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
              <span className="text-sm text-zinc-500">{f.brandColor}</span>
            </div>
          </Field>
        </div>
        <Field label="One-liner">
          <input className={inputCls} maxLength={120} value={f.oneLiner} onChange={(e) => set("oneLiner", e.target.value)} placeholder="Every yield strategy on every chain, one dashboard." />
        </Field>
        <Field label="Features (3–6)">
          <div className="space-y-3">
            {f.features.map((feat, i) => (
              <input key={i} className={inputCls} maxLength={80} value={feat} onChange={(e) => setFeature(i, e.target.value)} placeholder={`Feature ${i + 1}`} />
            ))}
            {f.features.length < 6 && (
              <button onClick={() => set("features", [...f.features, ""])} className="text-sm text-zinc-500 hover:text-zinc-300">
                + add feature
              </button>
            )}
          </div>
        </Field>
        <Field label="Screenshot URL">
          <input className={inputCls} value={f.screenshot} onChange={(e) => set("screenshot", e.target.value)} placeholder="https://… (min 400px wide)" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Length">
            <select className={inputCls} value={f.duration} onChange={(e) => set("duration", e.target.value)}>
              {DURATIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Voice">
            <select className={inputCls} value={f.voice} onChange={(e) => set("voice", e.target.value)}>
              {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Tone">
            <select className={inputCls} value={f.tone} onChange={(e) => set("tone", e.target.value)}>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <SubmitBar
          color={color}
          free
          submitting={submitting}
          error={error}
          onSubmit={() =>
            submit({
              productName: f.productName,
              oneLiner: f.oneLiner,
              features: f.features.filter(Boolean),
              screenshots: [f.screenshot],
              brandColor: f.brandColor,
              voice: f.voice,
              tone: f.tone,
              duration: f.duration,
            })
          }
        />
      </div>
      <Preview
        color={f.brandColor}
        title={f.productName || "Your product"}
        sub={f.oneLiner || "Your one-liner appears here"}
        rows={f.features.filter(Boolean)}
        footer={`${DURATIONS.find((d) => d.id === f.duration)?.label} · ${f.voice} · ${f.tone}`}
      />
    </div>
  );
}

function StatClipForm({ color }: { color: string }) {
  const { submit, submitting, error } = useDemoSubmit("stat-clip");
  const [title, setTitle] = useState("");
  const [brandColor, setBrandColor] = useState("#4ADEDE");
  const [narrate, setNarrate] = useState(true);
  const [stats, setStats] = useState([
    { label: "", value: "", unit: "" },
    { label: "", value: "", unit: "" },
  ]);
  const setStat = (i: number, k: string, v: string) =>
    setStats((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Title">
            <input className={inputCls} maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly On-Chain Report" />
          </Field>
          <Field label="Brand color">
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-12 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
              <span className="text-sm text-zinc-500">{brandColor}</span>
            </div>
          </Field>
        </div>
        <Field label="Stats (2–6)">
          <div className="space-y-3">
            {stats.map((st, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_70px] gap-2">
                <input className={inputCls} maxLength={24} value={st.label} onChange={(e) => setStat(i, "label", e.target.value)} placeholder="TVL" />
                <input className={inputCls} value={st.value} onChange={(e) => setStat(i, "value", e.target.value)} placeholder="4.2" inputMode="decimal" />
                <input className={inputCls} maxLength={8} value={st.unit} onChange={(e) => setStat(i, "unit", e.target.value)} placeholder="B" />
              </div>
            ))}
            {stats.length < 6 && (
              <button onClick={() => setStats([...stats, { label: "", value: "", unit: "" }])} className="text-sm text-zinc-500 hover:text-zinc-300">
                + add stat
              </button>
            )}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm text-zinc-400">
          <input type="checkbox" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} className="h-4 w-4 accent-[#4ADEDE]" />
          Add AI narration
        </label>
        <SubmitBar
          color={color}
          free
          submitting={submitting}
          error={error}
          onSubmit={() =>
            submit({
              title,
              brandColor,
              narrate,
              stats: stats
                .filter((s) => s.label && s.value !== "")
                .map((s) => ({ label: s.label, value: Number(s.value), unit: s.unit || undefined })),
            })
          }
        />
      </div>
      <Preview
        color={brandColor}
        title={title || "Your report"}
        sub={narrate ? "Narrated data highlight" : "Music-only data highlight"}
        rows={stats.filter((s) => s.label).map((s) => `${s.label}: ${s.value}${s.unit}`)}
        footer="10–20s · animated count-ups"
      />
    </div>
  );
}

function AppTourForm({ color }: { color: string }) {
  const [url, setUrl] = useState("");
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-5">
        <Field label="App URL">
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com" />
        </Field>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm leading-relaxed text-zinc-400">
          App Tour drives a real browser through your app with an animated cursor, then
          wraps the recording in a branded intro, caption chips, and narration. Because it
          runs a live browser session, it&apos;s a paid render — connect a wallet on the
          deployed build to run it. You define the steps (click, scroll, type) and a
          caption for each.
        </div>
        <SubmitBar color={color} free={false} submitting={false} error={null} onSubmit={() => {}} />
      </div>
      <Preview color={color} title="App Tour" sub={url || "https://your-app.com"} rows={["Animated cursor walkthrough", "Step caption chips", "Branded intro + outro", "AI narration"]} footer="up to 3 min · real screen recording" />
    </div>
  );
}

function Preview({
  color,
  title,
  sub,
  rows,
  footer,
}: {
  color: string;
  title: string;
  sub: string;
  rows: string[];
  footer: string;
}) {
  const grad = useMemo(() => `radial-gradient(ellipse at 30% 15%, ${color}33, transparent 60%), #0B0B12`, [color]);
  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Live preview</div>
      <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-white/10 p-8" style={{ background: grad }}>
        <div className="flex h-full flex-col justify-center">
          <div className="font-display text-3xl font-bold" style={{ color }}>{title}</div>
          <div className="mt-2 text-sm text-zinc-400">{sub}</div>
          <div className="mt-4 space-y-1.5">
            {rows.slice(0, 6).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px] text-zinc-300">
                <span style={{ color }}>▸</span>
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-zinc-600">{footer}</div>
    </div>
  );
}
