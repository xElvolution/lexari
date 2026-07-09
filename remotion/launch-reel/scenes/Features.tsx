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
            ? { x: 0, y: (1 - s) * 90 }
            : { x: (1 - s) * (i % 2 === 0 ? -140 : 140), y: 0 };
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: twoCol ? 30 : 44,
                padding: twoCol ? "32px 38px" : "40px 52px",
                borderRadius: 28,
                background: `linear-gradient(135deg, ${theme.surface}F2, ${theme.bgSoft}E6)`,
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
                transform: `translate(${slide.x}px, ${slide.y}px) scale(${0.94 + s * 0.06})`,
                opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
              }}
            >
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
