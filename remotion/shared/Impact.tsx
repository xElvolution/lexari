import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";

/**
 * Impact primitives — the "feel it" layer. Deterministic camera shake,
 * flash frames, chromatic-aberration bursts and speed streaks that scenes
 * fire on landing moments. All seeded/index-derived, no randomness.
 */

/** Decaying camera shake. Wrap a scene; fire at `delay`. */
export const Shake: React.FC<{
  children: React.ReactNode;
  delay: number;
  strength?: number;
  durationInFrames?: number;
  seed?: string;
}> = ({ children, delay, strength = 14, durationInFrames = 18, seed = "shake" }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  let x = 0;
  let y = 0;
  let rot = 0;
  if (local >= 0 && local < durationInFrames) {
    const decay = Math.pow(1 - local / durationInFrames, 1.6);
    const amp = strength * decay;
    x = noise2D(seed + "x", local * 0.9, 0) * amp;
    y = noise2D(seed + "y", 0, local * 0.9) * amp;
    rot = noise2D(seed + "r", local * 0.7, 7) * decay * 0.8;
  }
  return (
    <AbsoluteFill
      style={{ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)` }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** 2–3 frame white/accent flash on impact. */
export const Flash: React.FC<{
  delay: number;
  color?: string;
  peak?: number;
}> = ({ delay, color = "#FFFFFF", peak = 0.65 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [delay, delay + 1, delay + 6],
    [0, peak, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (opacity <= 0.01) return null;
  return (
    <AbsoluteFill
      style={{ background: color, opacity, mixBlendMode: "screen", pointerEvents: "none" }}
    />
  );
};

/**
 * Chromatic aberration burst: red/cyan ghost copies split apart for a few
 * frames, then snap back. Wrap the element that "hits".
 */
export const ChromaBurst: React.FC<{
  children: React.ReactNode;
  delay: number;
  strength?: number;
  durationInFrames?: number;
}> = ({ children, delay, strength = 10, durationInFrames = 9 }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  const active = local >= 0 && local < durationInFrames;
  const split = active
    ? strength * Math.pow(1 - local / durationInFrames, 1.4)
    : 0;
  if (!active) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${-split}px)`,
          filter: "saturate(2)",
          opacity: 0.5,
          mixBlendMode: "screen",
          color: "#FF3B5C",
        }}
        aria-hidden
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${split}px)`,
          filter: "saturate(2)",
          opacity: 0.5,
          mixBlendMode: "screen",
          color: "#26D9FF",
        }}
        aria-hidden
      >
        {children}
      </div>
      {children}
    </div>
  );
};

/**
 * Speed streaks: horizontal motion-blur lines that trail a fly-in.
 * Fire during the entrance, angled along the travel direction.
 */
export const SpeedStreaks: React.FC<{
  delay: number;
  durationInFrames?: number;
  angle?: number;
  color: string;
  count?: number;
  seed?: string;
}> = ({ delay, durationInFrames = 16, angle = 0, color, count = 14, seed = "streaks" }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0 || local > durationInFrames) return null;
  const p = local / durationInFrames;
  const fade = Math.sin(Math.PI * Math.min(p * 1.4, 1));
  return (
    <AbsoluteFill
      style={{
        transform: `rotate(${angle}deg)`,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const y = ((i * 173) % 100) / 100;
        const len = 180 + ((i * 97) % 340);
        const speed = 1.4 + ((i * 61) % 100) / 90;
        const xTravel = (p * speed * 2 - 0.5) * 2400;
        const jitter = noise2D(seed + i, i, 0) * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${y * 100}%`,
              left: -400 + xTravel + jitter,
              width: len,
              height: 2 + ((i * 31) % 3),
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent, ${color}AA, transparent)`,
              opacity: fade * (0.25 + ((i * 43) % 50) / 100),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
