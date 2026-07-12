"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal, SectionTitle } from "./Reveal";

/**
 * Sample gallery. Each card pairs the rendered MP4 with the exact input
 * JSON that produced it — honest input→output, no cherry-picked mystery.
 * Videos land in /public/samples via scripts/render-samples.ts; until
 * then cards show a poster state.
 */

export interface GalleryItem {
  id: string;
  title: string;
  template: "launch-reel" | "stat-clip";
  brandColor: string;
  video: string; // /samples/*.mp4
  input: Record<string, unknown>;
}

export const GALLERY: GalleryItem[] = [
  {
    id: "self",
    title: "RenderReel × RenderReel",
    template: "launch-reel",
    brandColor: "#6C5CE7",
    video: "/samples/self.mp4",
    input: {
      productName: "RenderReel",
      oneLiner: "The motion studio that agents hire.",
      features: [
        "JSON in, cinematic MP4 out",
        "AI voiceover with word-synced captions",
        "Verifiable on-chain receipt per render",
      ],
      brandColor: "#6C5CE7",
    },
  },
  {
    id: "defi",
    title: "DeFi dashboard launch",
    template: "launch-reel",
    brandColor: "#00B894",
    video: "/samples/defi.mp4",
    input: {
      productName: "Vaultline",
      oneLiner: "Every yield strategy on every chain, one dashboard.",
      features: [
        "Live APY across 40+ protocols",
        "One-click position migration",
        "Risk scoring on every vault",
      ],
      brandColor: "#00B894",
    },
  },
  {
    id: "devtool",
    title: "Dev-tool launch, phone shots",
    template: "launch-reel",
    brandColor: "#FF7A59",
    video: "/samples/devtool.mp4",
    input: {
      productName: "Hookdeck",
      oneLiner: "Ship webhooks you can actually debug.",
      features: [
        "Replay any event from history",
        "Local tunnel with zero config",
        "Alerting on delivery failures",
      ],
      brandColor: "#FF7A59",
    },
  },
  {
    id: "report",
    title: "Agent-generated weekly report",
    template: "stat-clip",
    brandColor: "#4ADEDE",
    video: "/samples/report.mp4",
    input: {
      title: "Weekly On-Chain Report",
      stats: [
        { label: "TVL", value: 4.2, unit: "B", delta: 12 },
        { label: "Active wallets", value: 812000, delta: 8.4 },
        { label: "Avg fee", value: 0.4, unit: "¢", delta: -22 },
        { label: "Tx volume", value: 96, unit: "M", delta: 15 },
      ],
      brandColor: "#4ADEDE",
      narrate: true,
    },
  },
  {
    id: "kpi",
    title: "Startup KPI announcement",
    template: "stat-clip",
    brandColor: "#F5A623",
    video: "/samples/kpi.mp4",
    input: {
      title: "Q2 in numbers",
      stats: [
        { label: "Revenue", value: 1.8, unit: "M", delta: 44 },
        { label: "Customers", value: 2300, delta: 31 },
      ],
      brandColor: "#F5A623",
      narrate: false,
    },
  },
];

export default function Gallery() {
  return (
    <section id="gallery" className="relative mx-auto max-w-7xl px-6 py-32">
      <SectionTitle
        kicker="Gallery"
        title="Input on the left. Film on the right."
        sub="Every sample below was rendered by the service itself — the JSON shown is the complete input, nothing else."
      />
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {GALLERY.map((item, i) => (
          <Reveal key={item.id} delay={(i % 3) * 0.1}>
            <GalleryCard item={item} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showJson, setShowJson] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    // Videos land via render-samples; probe so missing files show the
    // branded placeholder instead of a black box.
    fetch(item.video, { method: "HEAD" })
      .then((r) =>
        setAvailable(r.ok && (r.headers.get("content-type") ?? "").startsWith("video")),
      )
      .catch(() => setAvailable(false));
  }, [item.video]);

  return (
    <div
      className="group overflow-hidden rounded-3xl border border-line bg-surface transition-colors duration-300 hover:border-line-strong"
      onMouseEnter={() => videoRef.current?.play().catch(() => {})}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        {available ? (
          <video
            ref={videoRef}
            src={item.video}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            onError={() => setAvailable(false)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `radial-gradient(ellipse at 30% 20%, ${item.brandColor}33, transparent 60%), var(--bg-2)`,
            }}
          >
            <span className="text-sm font-medium tracking-wide text-faint">
              rendering sample…
            </span>
          </div>
        )}
        <div
          className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black"
          style={{ background: item.brandColor }}
        >
          {item.template}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <button
            onClick={() => setShowJson((v) => !v)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-[#6C5CE7]/60 hover:text-ink"
          >
            {showJson ? "hide input" : "{ input }"}
          </button>
        </div>
        {showJson && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-xl border border-line bg-elev p-4 text-[12px] leading-relaxed text-[#4ADEDE]">
            {JSON.stringify(item.input, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
