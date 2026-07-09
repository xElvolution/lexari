"use client";

import { Reveal, SectionTitle } from "./Reveal";

const PLANS = [
  {
    name: "Stat Clip",
    price: "$2",
    per: "per render",
    color: "#4ADEDE",
    features: [
      "10–20s animated data highlight",
      "2–6 stats, count-ups & deltas",
      "Optional AI narration",
      "1080p MP4 · brand-themed",
      "On-chain receipt",
    ],
  },
  {
    name: "Launch Reel",
    price: "$5",
    per: "per render",
    color: "#6C5CE7",
    flagship: true,
    features: [
      "Up to 40s cinematic launch film",
      "Kinetic typography + device-framed shots",
      "AI voiceover, 3 voices, 3 tones",
      "Word-synced animated captions",
      "1080p MP4 · on-chain receipt",
    ],
  },
  {
    name: "Free demo",
    price: "$0",
    per: "2 per day",
    color: "#8B8B9E",
    features: [
      "Full Launch Reel pipeline",
      "720p with watermark",
      "Queued behind paid renders",
      "No wallet needed",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-6 py-32">
      <SectionTitle
        kicker="Pricing"
        title="Priced like an API, not an agency"
        sub="A human motion designer quotes $500 and a week. An agent can't hire one of those — it can hire this."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <Reveal key={plan.name} delay={i * 0.1}>
            <div
              className={`relative h-full rounded-3xl border p-8 ${
                plan.flagship
                  ? "border-[#6C5CE7]/60 bg-gradient-to-b from-[#6C5CE7]/15 to-transparent"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {plan.flagship && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#4ADEDE] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                  Flagship
                </div>
              )}
              <h3 className="text-lg font-semibold" style={{ color: plan.color }}>
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-6xl font-bold">{plan.price}</span>
                <span className="text-sm text-zinc-500">{plan.per}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] text-zinc-300">
                    <span style={{ color: plan.color }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <p className="mt-10 text-center text-sm text-zinc-500">
          Paid in USDT0 on X Layer via x402 · gasless EIP-3009 transfers · settlement confirmed before render starts
        </p>
      </Reveal>
    </section>
  );
}
