import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { Theme } from "./theme";

/**
 * Cinematic animated backdrop: deep brand-tinted base, two drifting
 * radial glows, and a fine noise grain. Deterministic (seeded noise).
 */
export const Backdrop: React.FC<{ theme: Theme; seed?: string }> = ({
  theme,
  seed = "renderreel",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const t = frame / 90;
  const x1 = width * (0.25 + 0.12 * noise2D(seed + "a", t * 0.35, 0));
  const y1 = height * (0.3 + 0.14 * noise2D(seed + "b", 0, t * 0.3));
  const x2 = width * (0.78 + 0.1 * noise2D(seed + "c", t * 0.28, 5));
  const y2 = height * (0.72 + 0.12 * noise2D(seed + "d", 5, t * 0.33));

  const breathe = 1 + 0.06 * Math.sin(frame / 45);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <div
        style={{
          position: "absolute",
          left: x1,
          top: y1,
          width: width * 0.9 * breathe,
          height: width * 0.9 * breathe,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${theme.accent}33 0%, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x2,
          top: y2,
          width: width * 0.75,
          height: width * 0.75,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${theme.gradient[1]}26 0%, transparent 60%)`,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 55%, ${theme.bg} 130%)`,
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

/** Slow scale-in used to give static content a filmic push. */
export function slowPush(frame: number, durationInFrames: number): number {
  return interpolate(frame, [0, durationInFrames], [1, 1.045], {
    extrapolateRight: "clamp",
  });
}
