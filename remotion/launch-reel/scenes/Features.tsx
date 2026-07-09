import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Theme } from "@/remotion/shared/theme";
import { DISPLAY_FONT, BODY_FONT } from "@/remotion/shared/fonts";

/**
 * Scene 2 — feature cards cascade in with numbered accents.
 * 3 features: single column, alternating slide directions.
 * 4-6 features: two-column grid, staggered rise.
 */
export const Features: React.FC<{
  features: string[];
  theme: Theme;
  durationInFrames: number;
}> = ({ features, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const twoCol = features.length > 3;
  // Spread the reveals across the first ~60% of the scene so long scenes
  // (standard/extended narration) don't front-load all motion.
  const staggerWindow = Math.max(durationInFrames * 0.55 - 8, 12);
  const stagger = Math.min(staggerWindow / features.length, 22);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={
          twoCol
            ? {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 34,
                width: 1560,
              }
            : { display: "flex", flexDirection: "column", gap: 42, width: 1240 }
        }
      >
        {features.map((feature, i) => {
          const delay = 4 + i * stagger;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { damping: 17, stiffness: 105, mass: 0.9 },
          });
          const slide = twoCol
            ? { x: 0, y: (1 - s) * 120 }
            : { x: (1 - s) * (i % 2 === 0 ? -180 : 180), y: 0 };
          const rotY = twoCol ? 0 : (1 - s) * (i % 2 === 0 ? -24 : 24);
          const landed = s > 0.85;
          const idleFloat = Math.sin((frame - delay) / 38 + i * 1.7) * 4;
          const underline = interpolate(
            frame - delay - 10,
            [0, 26],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: twoCol ? 30 : 44,
                padding: twoCol ? "32px 38px" : "40px 52px",
                borderRadius: 28,
                background: `linear-gradient(135deg, ${theme.surface}F2, ${theme.bgSoft}E6)`,
                border: `1px solid ${landed ? theme.accent + "44" : "rgba(255,255,255,0.09)"}`,
                boxShadow: landed
                  ? `0 30px 80px rgba(0,0,0,0.35), 0 0 46px ${theme.accent}22`
                  : "0 30px 80px rgba(0,0,0,0.35)",
                transform: `perspective(1100px) translate(${slide.x}px, ${slide.y + (landed ? idleFloat : 0)}px) rotateY(${rotY}deg) scale(${0.92 + s * 0.08})`,
                opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
                overflow: "hidden",
              }}
            >
              {/* animated accent underline */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  height: 4,
                  width: `${underline * 100}%`,
                  background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  minWidth: twoCol ? 68 : 84,
                  height: twoCol ? 68 : 84,
                  borderRadius: twoCol ? 18 : 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 700,
                  fontSize: twoCol ? 32 : 40,
                  color: theme.bg,
                  background: `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
                  boxShadow: `0 0 44px ${theme.accent}55`,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  fontFamily: BODY_FONT,
                  fontWeight: 600,
                  fontSize: twoCol ? 36 : 44,
                  lineHeight: 1.3,
                  color: theme.text,
                  letterSpacing: "-0.01em",
                }}
              >
                {feature}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
