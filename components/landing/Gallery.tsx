"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal, SectionTitle } from "./Reveal";

/**
 * Sample gallery of flip cards: the front shows the exact brief that was
 * submitted (the input is the story); clicking flips the card in 3D to the
 * rendered film. Honest input→output, one gesture apart.
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
    title: "Lexari × Lexari",
    template: "launch-reel",
    brandColor: "#6C5CE7",
    video: "/samples/self.mp4",
    input: {
      productName: "Lexari",
      oneLiner: "The motion studio that agents hire.",
      features: [
        "JSON in, cinematic MP4 out",
        "Narrated with word-synced captions",
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
        title="The brief is the front. The film is the back."
        sub="Each card shows the exact input that was submitted — click it to flip to the video it produced."
      />
      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {GALLERY.map((item, i) => (
          <Reveal key={item.id} delay={(i % 3) * 0.1}>
            <FlipCard item={item} />
          </Reveal>
        ))}
      </div>
      <style>{`
        .flip-scene { perspective: 1400px; }
        .flip-inner {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .flip-scene.flipped .flip-inner { transform: rotateY(180deg); }
        .flip-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-back { transform: rotateY(180deg); }
      `}</style>
    </section>
  );
}

function FlipCard({ item }: { item: GalleryItem }) {
  const [flipped, setFlipped] = useState(false);
  const [available, setAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(item.video, { method: "HEAD" })
      .then((r) =>
        setAvailable(r.ok && (r.headers.get("content-type") ?? "").startsWith("video")),
      )
      .catch(() => setAvailable(false));
  }, [item.video]);

  useEffect(() => {
    if (flipped) videoRef.current?.play().catch(() => {});
    else {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [flipped]);

  const input = item.input;
  const isLaunch = item.template === "launch-reel";

  return (
    <div
      className={`flip-scene h-[420px] cursor-pointer select-none ${flipped ? "flipped" : ""}`}
      onClick={() => setFlipped((f) => !f)}
      data-cursor
    >
      <div className="flip-inner h-full w-full">
        {/* FRONT — the brief */}
        <div
          className="flip-face absolute inset-0 flex flex-col overflow-hidden rounded-3xl border border-line p-7"
          style={{
            background: `linear-gradient(160deg, ${item.brandColor}1f, transparent 55%), var(--elev)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black"
              style={{ background: item.brandColor }}
            >
              {item.template}
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-faint">
              the brief
            </span>
          </div>

          {isLaunch ? (
            <>
              <div className="mt-6 font-display text-3xl font-bold" style={{ color: item.brandColor }}>
                {String(input.productName)}
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {String(input.oneLiner)}
              </p>
              <ul className="mt-5 space-y-2.5">
                {(input.features as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                    <span style={{ color: item.brandColor }}>▸</span>
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="mt-6 font-display text-3xl font-bold" style={{ color: item.brandColor }}>
                {String(input.title)}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(input.stats as { label: string; value: number; unit?: string; delta?: number }[]).map(
                  (s) => (
                    <div key={s.label} className="rounded-xl border border-line bg-surface px-4 py-3">
                      <div className="text-[11px] uppercase tracking-wider text-faint">{s.label}</div>
                      <div className="mt-0.5 font-display text-xl font-bold text-ink">
                        {s.value.toLocaleString()}
                        {s.unit}
                        {typeof s.delta === "number" && (
                          <span
                            className="ml-2 text-xs font-semibold"
                            style={{ color: s.delta >= 0 ? "#4ADE80" : "#F87171" }}
                          >
                            {s.delta >= 0 ? "▲" : "▼"} {Math.abs(s.delta)}
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          <div className="mt-auto flex items-center justify-between pt-5">
            <span className="text-sm font-medium text-muted">{item.title}</span>
            <span
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-transform"
              style={{ borderColor: `${item.brandColor}66`, color: item.brandColor }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch the film
            </span>
          </div>
        </div>

        {/* BACK — the film */}
        <div
          className="flip-face flip-back absolute inset-0 overflow-hidden rounded-3xl border border-line"
          style={{ background: "var(--elev)" }}
        >
          {available ? (
            <video
              ref={videoRef}
              src={item.video}
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              onError={() => setAvailable(false)}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-3"
              style={{
                background: `radial-gradient(ellipse at 30% 20%, ${item.brandColor}33, transparent 60%), var(--bg-2)`,
              }}
            >
              <span className="text-sm font-medium tracking-wide text-faint">
                sample rendering…
              </span>
            </div>
          )}
          <button
            className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/50 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/70"
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(false);
            }}
          >
            ← view brief
          </button>
        </div>
      </div>
    </div>
  );
}
