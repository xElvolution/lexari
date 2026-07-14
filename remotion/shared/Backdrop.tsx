import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Theme } from "./theme";

/**
 * Cinematic backdrop: aurora gradient bands drifting over a deep base,
 * a perspective grid floor, rising dust particles, vignette and grain.
 * Fully deterministic (seeded noise, index-derived positions).
 */
export const Backdrop: React.FC<{ theme: Theme; seed?: string }> = ({
  theme,
  seed = "lexari",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 90;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, overflow: "hidden" }}>
      {/* aurora bands */}
      {[0, 1, 2].map((i) => {
        const drift = noise2D(seed + "band" + i, t * 0.22, i * 7) * 160;
        const tilt = -16 + i * 14 + noise2D(seed + "tilt" + i, t * 0.15, i) * 6;
        const color = i === 1 ? theme.gradient[1] : theme.accent;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -width * 0.25,
              top: height * (0.12 + i * 0.3) + drift,
              width: width * 1.5,
              height: height * 0.34,
              background: `linear-gradient(90deg, transparent 0%, ${color}2E 30%, ${color}14 55%, transparent 100%)`,
              filter: "blur(70px)",
              transform: `rotate(${tilt}deg)`,
            }}
          />
        );
      })}

      {/* perspective grid floor */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -height * 0.02,
          width: width * 2.2,
          height: height * 0.42,
          transform: "translateX(-50%) perspective(700px) rotateX(62deg)",
          transformOrigin: "bottom center",
          backgroundImage: `linear-gradient(${theme.accent}26 1.5px, transparent 1.5px), linear-gradient(90deg, ${theme.accent}26 1.5px, transparent 1.5px)`,
          backgroundSize: "90px 90px",
          backgroundPosition: `0px ${(frame * 0.9) % 90}px`,
          maskImage:
            "linear-gradient(to top, rgba(0,0,0,0.5), transparent 85%)",
          WebkitMaskImage:
            "linear-gradient(to top, rgba(0,0,0,0.5), transparent 85%)",
        }}
      />

      {/* rising dust */}
      {Array.from({ length: 26 }).map((_, i) => {
        const px = ((i * 197) % 100) / 100;
        const speed = 0.35 + ((i * 83) % 40) / 100;
        const py = 1.15 - (((t * speed + i * 0.61) % 1.3) as number);
        const tw = 0.5 + 0.5 * Math.sin(frame / 14 + i * 2.1);
        const size = 2 + ((i * 31) % 4);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px * width + noise2D(seed + "dx" + i, t * 0.4, i) * 30,
              top: py * height,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? theme.gradient[1] : theme.accentSoft,
              opacity: 0.16 + tw * 0.3,
              boxShadow: `0 0 ${6 + tw * 8}px ${theme.accent}88`,
            }}
          />
        );
      })}

      {/* vignette + grain */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 52%, ${theme.bg} 128%)`,
        }}
      />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const shift = (frame % 4) * 25;
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
        backgroundPosition: `${shift}px ${shift}px`,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** Diagonal light sweep — run across text or frames for a premium sheen. */
export const LightSweep: React.FC<{
  delay: number;
  durationInFrames?: number;
  angle?: number;
}> = ({ delay, durationInFrames = 26, angle = 24 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + durationInFrames], [-0.35, 1.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (p <= -0.34 || p >= 1.34) return null;
  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: "-30%",
          background: `linear-gradient(${angle + 90}deg, transparent ${p * 100 - 9}%, rgba(255,255,255,0.14) ${p * 100 - 2}%, rgba(255,255,255,0.3) ${p * 100}%, rgba(255,255,255,0.14) ${p * 100 + 2}%, transparent ${p * 100 + 9}%)`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

/** Expanding shockwave ring for landing moments. */
export const Shockwave: React.FC<{
  delay: number;
  color: string;
  size?: number;
}> = ({ delay, color, size = 900 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}
    >
      <div
        style={{
          width: size * (0.15 + p * 0.85),
          height: size * (0.15 + p * 0.85),
          borderRadius: "50%",
          border: `${3 - p * 2.4}px solid ${color}`,
          opacity: (1 - p) * 0.55,
          boxShadow: `0 0 ${60 * (1 - p)}px ${color}66`,
        }}
      />
    </AbsoluteFill>
  );
};
