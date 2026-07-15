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
import { Rise } from "@/remotion/shared/KineticText";
import { LightSweep, Shockwave } from "@/remotion/shared/Backdrop";
import { Shake, Flash, ChromaBurst } from "@/remotion/shared/Impact";

/**
 * Scene 1 — violent cold open: the product name SLAMS in oversized,
 * camera shakes on landing, flash frame + chromatic split, shockwave,
 * light sweep, then the one-liner takes the stage.
 */
export const Hook: React.FC<{
  productName: string;
  oneLiner: string;
  logoUrl: string | null;
  theme: Theme;
  durationInFrames?: number;
}> = ({ productName, oneLiner, logoUrl, theme, durationInFrames = 180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const phase2 = interpolate(
    frame,
    [durationInFrames * 0.45, durationInFrames * 0.8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const dolly = interpolate(frame, [0, durationInFrames], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  const orb = spring({ frame, fps, config: { damping: 26, stiffness: 50 } });
  const logoSpring = spring({
    frame: frame - 2,
    fps,
    config: { damping: 12, stiffness: 150 },
  });
  const lineGrow = spring({
    frame: frame - 20,
    fps,
    config: { damping: 20, stiffness: 90 },
  });

  const chars = productName.split("");
  // Faster slam: chars land hard and close together.
  const charStagger = 1.6;
  const nameDone = 6 + chars.length * charStagger;
  // Bigger. Bleed toward the frame edges — launch-video energy.
  const nameSize = Math.min(210, (1780 / Math.max(productName.length, 1)) * 1.35);

  return (
    <Shake delay={nameDone} strength={16} seed={productName}>
      <Flash delay={nameDone} color={theme.accentSoft} peak={0.5} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          transform: `scale(${dolly})`,
        }}
      >
        {/* blooming gradient orb behind everything */}
        <div
          style={{
            position: "absolute",
            width: 1200 * orb,
            height: 1200 * orb,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.accent}38 0%, ${theme.gradient[1]}1C 40%, transparent 70%)`,
            filter: "blur(20px)",
            transform: `rotate(${frame * 0.15}deg)`,
          }}
        />
        {/* orbiting accent satellites keep the frame alive after the slam */}
        {[0, 1, 2].map((i) => {
          const a = frame / (46 + i * 14) + (i * Math.PI * 2) / 3;
          const r = 440 + i * 95;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                transform: `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r * 0.45}px)`,
                width: 7 - i,
                height: 7 - i,
                borderRadius: "50%",
                background: i === 1 ? theme.gradient[1] : theme.accentSoft,
                opacity: 0.5 * orb,
                boxShadow: `0 0 14px ${theme.accent}`,
              }}
            />
          );
        })}
        <Shockwave delay={nameDone} color={theme.accent} size={1500} />

        {logoUrl && (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              overflow: "hidden",
              marginBottom: 40,
              transform: `scale(${logoSpring}) rotate(${(1 - logoSpring) * -12}deg)`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 70px ${theme.accent}55`,
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* character slam: chars drop from above oversized, land with a
            squash; whole lockup chroma-splits on the landing frame */}
        <ChromaBurst delay={nameDone} strength={14}>
          <div
            style={{
              display: "flex",
              perspective: 900,
              filter: `drop-shadow(0 0 40px ${theme.accent}66)`,
              transform: `translateY(${phase2 * -30}px) scale(${1 - phase2 * 0.07})`,
            }}
          >
            {chars.map((ch, i) => {
              const s = spring({
                frame: frame - (logoUrl ? 6 : 2) - i * charStagger,
                fps,
                config: { damping: 11, stiffness: 220, mass: 0.7 },
              });
              // Land from above at 1.9x with blur — a drop, not a rise.
              const drop = (1 - s) * -140;
              const size = 1.9 - s * 0.9;
              return (
                <span
                  key={i}
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 700,
                    fontSize: nameSize,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.02,
                    display: "inline-block",
                    whiteSpace: "pre",
                    transform: `translateY(${drop}px) scale(${size})`,
                    transformOrigin: "50% 80%",
                    opacity: interpolate(s, [0, 0.2, 1], [0, 1, 1]),
                    filter: s < 0.7 ? `blur(${(1 - s) * 7}px)` : undefined,
                    backgroundImage: `linear-gradient(120deg, ${theme.text} 25%, ${theme.accentSoft} 65%, ${theme.gradient[1]} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        </ChromaBurst>
        <LightSweep delay={nameDone + 2} />

        {/* growing rule */}
        <div
          style={{
            height: 4,
            width: interpolate(lineGrow, [0, 1], [0, 260]),
            borderRadius: 2,
            margin: "40px 0",
            background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
            boxShadow: `0 0 34px ${theme.accent}AA`,
          }}
        />

        <Rise delay={Math.round(nameDone) + 6}>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontWeight: 500,
              fontSize: 46 + phase2 * 4,
              maxWidth: 1300,
              textAlign: "center",
              lineHeight: 1.32,
              color: phase2 > 0.5 ? theme.text : theme.textDim,
              textShadow: phase2 > 0.5 ? `0 0 40px ${theme.accent}33` : "none",
            }}
          >
            {oneLiner}
          </div>
        </Rise>
      </AbsoluteFill>
    </Shake>
  );
};
