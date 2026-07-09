import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Theme } from "@/remotion/shared/theme";
import { DISPLAY_FONT, BODY_FONT } from "@/remotion/shared/fonts";
import { KineticText, Rise } from "@/remotion/shared/KineticText";

/** Scene 1 — product name lands hard, one-liner follows. */
export const Hook: React.FC<{
  productName: string;
  oneLiner: string;
  logoUrl: string | null;
  theme: Theme;
}> = ({ productName, oneLiner, logoUrl, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const lineGrow = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
      {logoUrl && (
        <div
          style={{
            width: 128,
            height: 128,
            borderRadius: 32,
            overflow: "hidden",
            marginBottom: 48,
            transform: `scale(${logoSpring}) rotate(${(1 - logoSpring) * -10}deg)`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${theme.accent}44`,
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <KineticText
        text={productName}
        delay={logoUrl ? 6 : 2}
        stagger={4}
        style={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          fontSize: 148,
          letterSpacing: "-0.03em",
          lineHeight: 1.02,
          color: theme.text,
          textAlign: "center",
        }}
        wordStyle={() => ({
          backgroundImage: `linear-gradient(120deg, ${theme.text} 30%, ${theme.accentSoft} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        })}
      />

      <div
        style={{
          height: 4,
          width: interpolate(lineGrow, [0, 1], [0, 220]),
          borderRadius: 2,
          margin: "44px 0",
          background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
          boxShadow: `0 0 30px ${theme.accent}88`,
        }}
      />

      <Rise delay={14}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 500,
            fontSize: 46,
            maxWidth: 1200,
            textAlign: "center",
            lineHeight: 1.35,
            color: theme.textDim,
          }}
        >
          {oneLiner}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
