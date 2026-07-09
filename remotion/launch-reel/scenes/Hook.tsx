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

/**
 * Scene 1 — cinematic cold open: gradient orb blooms, the product name
 * slams in character-by-character with 3D flips, a light sweep licks
 * across it, shockwave on landing, one-liner rises beneath.
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
  // Phase 2: after the name lands, the whole lockup eases upward and
  // slightly smaller while the one-liner takes the stage — the scene
  // keeps developing however long the narration holds it.
  const phase2 = interpolate(
    frame,
    [durationInFrames * 0.45, durationInFrames * 0.8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const dolly = interpolate(frame, [0, durationInFrames], [1, 1.055], {
    extrapolateRight: "clamp",
  });

  const orb = spring({ frame, fps, config: { damping: 26, stiffness: 50 } });
  const logoSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 12, stiffness: 140 },
  });
  const lineGrow = spring({
    frame: frame - 20,
    fps,
    config: { damping: 20, stiffness: 90 },
  });

  const chars = productName.split("");
  const nameDone = 8 + chars.length * 2.2;
  // Scale the title down for long names so it always fits one line.
  const nameSize = Math.min(150, (1500 / Math.max(productName.length, 1)) * 1.35);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
        transform: `scale(${dolly})`,
      }}
    >
      {/* blooming gradient orb behind everything */}
      <div
        style={{
          position: "absolute",
          width: 1100 * orb,
          height: 1100 * orb,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.accent}30 0%, ${theme.gradient[1]}18 40%, transparent 70%)`,
          filter: "blur(20px)",
          transform: `rotate(${frame * 0.15}deg)`,
        }}
      />
      {/* orbiting accent satellites keep the frame alive after the slam */}
      {[0, 1, 2].map((i) => {
        const a = frame / (46 + i * 14) + (i * Math.PI * 2) / 3;
        const r = 420 + i * 90;
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
      <Shockwave delay={nameDone} color={theme.accent} size={1300} />

      {logoUrl && (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 30,
            overflow: "hidden",
            marginBottom: 44,
            transform: `scale(${logoSpring}) rotate(${(1 - logoSpring) * -12}deg)`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 70px ${theme.accent}55`,
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* character-by-character 3D slam; eases up + smaller in phase 2 */}
      <div
        style={{
          display: "flex",
          perspective: 900,
          filter: `drop-shadow(0 0 34px ${theme.accent}55)`,
          transform: `translateY(${phase2 * -34}px) scale(${1 - phase2 * 0.08})`,
        }}
      >
        {chars.map((ch, i) => {
          const s = spring({
            frame: frame - (logoUrl ? 8 : 4) - i * 2.2,
            fps,
            config: { damping: 13, stiffness: 170, mass: 0.6 },
          });
          return (
            <span
              key={i}
              style={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: nameSize,
                letterSpacing: "-0.02em",
                lineHeight: 1.04,
                display: "inline-block",
                whiteSpace: "pre",
                transform: `rotateX(${(1 - s) * -95}deg) translateY(${(1 - s) * 60}px) scale(${0.6 + s * 0.4})`,
                transformOrigin: "50% 100%",
                opacity: interpolate(s, [0, 0.25, 1], [0, 1, 1]),
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
      <LightSweep delay={nameDone + 2} />

      {/* growing rule */}
      <div
        style={{
          height: 4,
          width: interpolate(lineGrow, [0, 1], [0, 240]),
          borderRadius: 2,
          margin: "42px 0",
          background: `linear-gradient(90deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
          boxShadow: `0 0 34px ${theme.accent}AA`,
        }}
      />

      <Rise delay={24}>
        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 500,
            fontSize: 44 + phase2 * 4,
            maxWidth: 1250,
            textAlign: "center",
            lineHeight: 1.35,
            color: phase2 > 0.5 ? theme.text : theme.textDim,
            textShadow: phase2 > 0.5 ? `0 0 40px ${theme.accent}33` : "none",
          }}
        >
          {oneLiner}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};
