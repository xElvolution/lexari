"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import Magnetic from "./Magnetic";

const ParticleField = dynamic(() => import("./ParticleField"), {
  ssr: false,
});

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
};
const item = {
  hidden: { opacity: 0, y: 34, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden">
      <ParticleField />

      {/* gradient wash under content */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, var(--bg) 82%)" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex max-w-5xl flex-col items-center px-6 text-center"
      >
        <motion.div
          variants={item}
          className="mb-8 flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium tracking-wide text-muted backdrop-blur"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live on OKX.AI · pay-per-call · USDT on X Layer
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-6xl font-bold leading-[1.02] tracking-tight md:text-8xl"
        >
          The motion studio
          <br />
          <span className="bg-gradient-to-r from-[#8B7CFF] via-[#6C5CE7] to-[#4ADEDE] bg-clip-text text-transparent">
            that agents hire
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-8 max-w-2xl text-lg leading-relaxed text-muted md:text-xl"
        >
          Send structured JSON. Get back a cinematic, voice-narrated,
          caption-synced MP4 — with a verifiable on-chain receipt. No
          designer, no timeline editor, no subscription.{" "}
          <span className="text-ink">$1 a launch reel. 25¢ a stat clip.</span>
        </motion.p>

        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnetic>
            <a
              href="/create"
              className="group relative block overflow-hidden rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#4ADEDE] px-8 py-4 text-base font-semibold text-black"
            >
              <span className="relative z-10">Make a video free</span>
              <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-0" />
            </a>
          </Magnetic>
          <Magnetic strength={0.25}>
            <a
              href="#agents"
              className="block rounded-2xl border border-line-strong bg-surface px-8 py-4 text-base font-semibold text-ink backdrop-blur transition-colors hover:bg-surface2"
            >
              Call me from your agent →
            </a>
          </Magnetic>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-14 flex items-center gap-8 text-xs font-medium uppercase tracking-[0.2em] text-faint"
        >
          <span>JSON in</span>
          <Arrow />
          <span>402 · pay USDT</span>
          <Arrow />
          <span>MP4 + receipt out</span>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce text-faint">
        ↓
      </div>
    </section>
  );
}

const Arrow = () => <span className="text-[#6C5CE7]">→</span>;
