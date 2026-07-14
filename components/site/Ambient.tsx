"use client";

import IconPattern from "./IconPattern";

/**
 * Fixed ambient backdrop behind all content: a Telegram-style scattered
 * motion-icon wallpaper, two slow-drifting brand glows, a faint perspective
 * grid, and film grain. Uses theme tokens so it adapts to light/dark.
 * This is what stops the page reading as flat black.
 */
export default function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base wash */}
      <div className="absolute inset-0" style={{ background: "var(--bg)" }} />

      {/* Telegram-style scattered motion-icon pattern */}
      <IconPattern />

      {/* drifting brand glows */}
      <div className="ambient-glow ambient-glow-1" />
      <div className="ambient-glow ambient-glow-2" />

      {/* faint grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--accent) 12%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      {/* grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <style>{`
        .ambient-glow {
          position: absolute;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: var(--glow);
          will-change: transform;
        }
        .ambient-glow-1 {
          width: 55vw; height: 55vw;
          top: -12vw; left: -8vw;
          background: radial-gradient(circle, var(--accent) 0%, transparent 62%);
          animation: drift1 26s ease-in-out infinite alternate;
        }
        .ambient-glow-2 {
          width: 48vw; height: 48vw;
          bottom: -14vw; right: -6vw;
          background: radial-gradient(circle, var(--accent-2) 0%, transparent 60%);
          animation: drift2 32s ease-in-out infinite alternate;
        }
        @keyframes drift1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(8vw, 6vw) scale(1.15); }
        }
        @keyframes drift2 {
          from { transform: translate(0,0) scale(1.1); }
          to   { transform: translate(-7vw, -5vw) scale(0.95); }
        }
        @keyframes iconFloat {
          from { transform: translateY(0); }
          to   { transform: translateY(-22px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="iconFloat"] { animation: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ambient-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}
