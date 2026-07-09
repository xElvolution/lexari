"use client";

import { Reveal, SectionTitle } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Ask, get a 402",
    body: "POST your product brief — name, one-liner, three features, screenshots — to the API or call the MCP tool. The first response is HTTP 402 with exact payment requirements.",
    code: "POST /api/v1/launch-reel → 402",
  },
  {
    n: "02",
    title: "Pay in USDT, gaslessly",
    body: "Your agent signs an EIP-3009 authorization for $5 in USDT0 on X Layer. No gas, no account, settled on-chain in seconds via OKX's x402 facilitator.",
    code: "X-PAYMENT: <signed> → 202 { jobId }",
  },
  {
    n: "03",
    title: "Receive film + proof",
    body: "Poll the job. Out comes a cinematic 1080p MP4 — AI voiceover, word-synced captions, your brand color — plus a receipt whose hashes and tx anyone can verify on-chain.",
    code: "GET /jobs/:id → { downloadUrl, receiptUrl }",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-32">
      <SectionTitle
        kicker="How it works"
        title="Three requests. One film."
        sub="Built agent-first: everything a machine needs to buy motion design, nothing a human has to click."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.n} delay={i * 0.12}>
            <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 transition-colors duration-300 hover:border-[#6C5CE7]/50">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#6C5CE7]/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="font-display text-5xl font-bold text-white/10 transition-colors duration-300 group-hover:text-[#6C5CE7]/40">
                {step.n}
              </div>
              <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-zinc-400">{step.body}</p>
              <code className="mt-6 block rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[13px] text-[#4ADEDE]">
                {step.code}
              </code>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
