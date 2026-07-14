"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { SectionTitle } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Ask, get a 402",
    body: "POST your product brief — name, one-liner, three features, screenshots — to the API or call the MCP tool. The first response is HTTP 402 with exact payment requirements.",
    code: "POST /api/v1/launch-reel → 402",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5h16v12H4z" /><path d="M4 9h16" /><path d="M8 13h5" /><circle cx="17" cy="13" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "Pay in USDT, gaslessly",
    body: "Your agent signs an EIP-3009 authorization for $5 in USDT0 on X Layer. No gas, no account, settled on-chain in seconds via OKX's x402 facilitator.",
    code: "X-PAYMENT: <signed> → 202 { jobId }",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4 14h7l-1 8 10-12h-7z" fill="currentColor" fillOpacity="0.15" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Receive film + proof",
    body: "Poll the job. Out comes a cinematic 1080p MP4 — AI voiceover, word-synced captions, your brand color — plus a receipt whose hashes and tx anyone can verify on-chain.",
    code: "GET /jobs/:id → { downloadUrl, receiptUrl }",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 5v14l11-7z" fill="currentColor" fillOpacity="0.15" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-6 py-32">
      <SectionTitle
        kicker="How it works"
        title="Three requests. One film."
        sub="Built agent-first: everything a machine needs to buy motion design, nothing a human has to click."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <TiltCard key={step.n} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}

function TiltCard({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 200, damping: 20 });
  const glowX = useTransform(px, (v) => `${v * 100}%`);
  const glowY = useTransform(py, (v) => `${v * 100}%`);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      data-cursor
      className="group relative h-full overflow-hidden rounded-3xl border border-line bg-surface p-8 transition-colors duration-300 hover:border-accent/60"
    >
      {/* animated gradient top border */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: "linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent)" }}
      />
      {/* cursor-following glow */}
      <motion.div
        className="pointer-events-none absolute h-56 w-56 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        style={{
          left: glowX,
          top: glowY,
          x: "-50%",
          y: "-50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)",
        }}
      />

      <div className="relative" style={{ transform: "translateZ(40px)" }}>
        <div className="flex items-center justify-between">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line transition-all duration-300 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent)",
              color: "var(--accent2)",
            }}
          >
            <span className="h-7 w-7">{step.icon}</span>
          </div>
          <div className="font-display text-5xl font-bold text-faint/40 transition-colors duration-300 group-hover:text-accent/50">
            {step.n}
          </div>
        </div>
        <h3 className="mt-5 text-2xl font-semibold">{step.title}</h3>
        <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
        <code
          className="mt-6 block rounded-xl border border-line bg-elev px-4 py-3 text-[13px]"
          style={{ color: "var(--accent2)" }}
        >
          {step.code}
        </code>
      </div>
    </motion.div>
  );
}
