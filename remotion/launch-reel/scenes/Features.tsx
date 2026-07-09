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

/** Scene 2 — three feature cards cascade in with numbered accents. */
export const Features: React.FC<{
  features: string[];
  theme: Theme;
  durationInFrames: number;
}> = ({ features, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const perCard = Math.max(
    Math.floor((durationInFrames - 14) / features.length),
    12,
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 42, width: 1240 }}>
        {features.map((feature, i) => {
          const delay = 4 + i * Math.min(perCard * 0.55, 16);
          const s = spring({
            frame: frame - delay,
            fps,
            config: { damping: 17, stiffness: 105, mass: 0.9 },
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 44,
                padding: "40px 52px",
                borderRadius: 28,
                background: `linear-gradient(135deg, ${theme.surface}F2, ${theme.bgSoft}E6)`,
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
                transform: `translateX(${(1 - s) * (i % 2 === 0 ? -140 : 140)}px) scale(${0.94 + s * 0.06})`,
                opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
              }}
            >
              <div
                style={{
                  minWidth: 84,
                  height: 84,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 700,
                  fontSize: 40,
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
                  fontSize: 44,
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
