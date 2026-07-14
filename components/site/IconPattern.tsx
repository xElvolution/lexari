"use client";

/**
 * Scattered labeled-icon wallpaper (Telegram-doodle style): big line-art
 * motion-design icons, each with a rotated caption beside it, placed across
 * the viewport at varied angles and low opacity. Fixed layer behind content.
 */

type Item = {
  x: number; // vw %
  y: number; // vh %
  rot: number;
  label: string;
  icon: keyof typeof ICONS;
  tint?: string;
  scale?: number;
};

// Deterministic scatter — covers the viewport, angled like the reference.
const ITEMS: Item[] = [
  { x: 6, y: 8, rot: -14, label: "PLAY", icon: "play" },
  { x: 82, y: 6, rot: 12, label: "x402", icon: "bolt", tint: "var(--accent-2)" },
  { x: 46, y: 12, rot: -6, label: "RENDER", icon: "film" },
  { x: 20, y: 26, rot: 8, label: "VOICEOVER", icon: "wave" },
  { x: 68, y: 24, rot: -10, label: "1080p", icon: "aperture" },
  { x: 90, y: 34, rot: 6, label: "MP4", icon: "clip" },
  { x: 8, y: 44, rot: 10, label: "USDT", icon: "dollar", tint: "#4ADE80" },
  { x: 40, y: 46, rot: -8, label: "CAPTIONS", icon: "caption" },
  { x: 72, y: 52, rot: 14, label: "ON-CHAIN", icon: "link" },
  { x: 16, y: 62, rot: -12, label: "AGENT", icon: "cursor" },
  { x: 52, y: 66, rot: 7, label: "STUDIO", icon: "sliders" },
  { x: 86, y: 70, rot: -6, label: "SPARK", icon: "star", tint: "var(--accent)" },
  { x: 28, y: 80, rot: 12, label: "LAUNCH", icon: "rocket" },
  { x: 62, y: 84, rot: -10, label: "RECEIPT", icon: "receipt", tint: "#F5A623" },
  { x: 92, y: 90, rot: 8, label: "STREAM", icon: "wave" },
  { x: 6, y: 90, rot: -8, label: "PLAY", icon: "play" },
];

export default function IconPattern() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 select-none"
      style={{
        maskImage:
          "radial-gradient(ellipse 95% 90% at 50% 40%, black 30%, transparent 88%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 95% 90% at 50% 40%, black 30%, transparent 88%)",
      }}
    >
      {ITEMS.map((it, i) => (
        <div
          key={i}
          className="doodle absolute flex flex-col items-center gap-1.5"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            transform: `translate(-50%,-50%) rotate(${it.rot}deg) scale(${it.scale ?? 1})`,
            color: it.tint ?? "var(--text)",
            opacity: "calc(0.10 + var(--glow) * 0.34)",
            animation: `doodleFloat ${14 + (i % 5) * 3}s ease-in-out ${i * 0.4}s infinite alternate`,
          }}
        >
          {ICONS[it.icon]}
          <span
            className="font-display text-[13px] font-semibold uppercase tracking-[0.22em]"
            style={{ opacity: 0.85 }}
          >
            {it.label}
          </span>
        </div>
      ))}
      <style>{`
        .doodle svg { width: 46px; height: 46px; stroke-width: 1.6; }
        @keyframes doodleFloat {
          from { translate: 0 0; }
          to   { translate: 0 -14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .doodle { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS = {
  play: (
    <svg viewBox="0 0 24 24">
      <path d="M7 4 L20 12 L7 20 Z" {...S} />
    </svg>
  ),
  film: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" {...S} />
      <path d="M3 10 H21 M3 14 H21 M8 5 V19 M16 5 V19" {...S} />
    </svg>
  ),
  clip: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="6" width="14" height="12" rx="2" {...S} />
      <path d="M17 10 L21 7 V17 L17 14" {...S} />
    </svg>
  ),
  wave: (
    <svg viewBox="0 0 24 24">
      <path d="M5 8 V16 M9 4 V20 M13 7 V17 M17 5 V19 M21 9 V15" {...S} />
    </svg>
  ),
  caption: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="3" {...S} />
      <path d="M7 11 H12 M7 15 H16" {...S} />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24">
      <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" {...S} />
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2 V22 M16 6 C16 4 14 3 12 3 C10 3 8 4 8 7 C8 12 16 10 16 15 C16 18 14 20 12 20 C10 20 8 19 8 17" {...S} />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24">
      <path d="M9 15 L15 9 M8 12 L6 14 A3 3 0 0 0 10 18 L12 16 M16 12 L18 10 A3 3 0 0 0 14 6 L12 8" {...S} />
    </svg>
  ),
  cursor: (
    <svg viewBox="0 0 24 24">
      <path d="M5 3 L5 19 L10 14 L13 21 L16 20 L13 13 L19 13 Z" {...S} />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24">
      <path d="M4 8 H20 M4 16 H20" {...S} />
      <circle cx="9" cy="8" r="2.5" {...S} />
      <circle cx="15" cy="16" r="2.5" {...S} />
    </svg>
  ),
  aperture: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M12 3 L15 9 M21 12 L14 13 M15 21 L12 14 M3 12 L10 11 M6 5 L11 10" {...S} />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3 L14.5 9 L21 9 L15.5 13 L17.5 20 L12 15.5 L6.5 20 L8.5 13 L3 9 L9.5 9 Z" {...S} />
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 24 24">
      <path d="M12 2 C16 5 17 10 17 13 L12 16 L7 13 C7 10 8 5 12 2 Z M7 13 L4 16 M17 13 L20 16 M10 18 L12 22 L14 18" {...S} />
      <circle cx="12" cy="9" r="2" {...S} />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="9" r="6" {...S} />
      <path d="M9 14 L8 22 L12 19 L16 22 L15 14" {...S} />
    </svg>
  ),
};
