import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { CaptionPage } from "@/pipeline/captions";
import type { Theme } from "./theme";
import { BODY_FONT } from "./fonts";

/**
 * Word-synced captions, lower third. The active word is highlighted in
 * the brand accent; pages come precomputed from createTikTokStyleCaptions.
 */
export const Captions: React.FC<{
  pages: CaptionPage[];
  theme: Theme;
}> = ({ pages, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nowMs = (frame / fps) * 1000;

  const page = pages.find(
    (p) => nowMs >= p.startMs && nowMs < p.startMs + p.durationMs + 120,
  );
  if (!page) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 92,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 12,
          rowGap: 6,
          padding: "18px 34px",
          borderRadius: 22,
          background: "rgba(8,8,12,0.55)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {page.tokens.map((token, i) => {
          const active = nowMs >= token.fromMs && nowMs < token.toMs + 60;
          const past = nowMs >= token.toMs + 60;
          return (
            <span
              key={i}
              style={{
                fontFamily: BODY_FONT,
                fontWeight: 800,
                fontSize: 42,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: active ? theme.accentSoft : past ? theme.text : "rgba(244,244,246,0.4)",
                transform: active ? "scale(1.08)" : "scale(1)",
                transition: "transform 80ms",
                display: "inline-block",
                textShadow: active ? `0 0 24px ${theme.accent}66` : "none",
              }}
            >
              {token.text.trim()}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
