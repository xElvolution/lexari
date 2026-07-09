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
import { LightSweep } from "@/remotion/shared/Backdrop";

/** Deterministic radial particle burst fired when the logo lands. */
const Burst: React.FC<{ delay: number; theme: Theme }> = ({ delay, theme }) => {
  const frame = useCurrentFrame();
  const local = frame - delay;
  if (local < 0 || local > 40) return null;
  const p = local / 40;
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}
    >
      {Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI * 2 + (i % 2) * 0.15;
        const dist = (140 + ((i * 53) % 120)) * Math.pow(p, 0.6);
        const size = 4 + ((i * 37) % 7) * (1 - p);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist * 0.85}px)`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? theme.gradient[1] : theme.accentSoft,
              opacity: (1 - p) * 0.9,
              boxShadow: `0 0 ${10 * (1 - p)}px ${theme.accent}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Scene 4 — logo reveal on brand gradient, name, and a quiet close. */
export const LogoOutro: React.FC<{
  productName: string;
  logoUrl: string | null;
  theme: Theme;
}> = ({ productName, logoUrl, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ringSpring = spring({ frame, fps, config: { damping: 30, stiffness: 60 } });
  const logoSpring = spring({ frame: frame - 5, fps, config: { damping: 13, stiffness: 130 } });
  const nameSpring = spring({ frame: frame - 16, fps, config: { damping: 18, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Burst delay={10} theme={theme} />
      <LightSweep delay={22} durationInFrames={28} />
      {/* expanding accent ring */}
      <div
        style={{
          position: "absolute",
          width: interpolate(ringSpring, [0, 1], [80, 1500]),
          height: interpolate(ringSpring, [0, 1], [80, 1500]),
          borderRadius: "50%",
          border: `2px solid ${theme.accent}`,
          opacity: interpolate(ringSpring, [0, 0.55, 1], [0.9, 0.32, 0]),
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <div
          style={{
            width: 172,
            height: 172,
            borderRadius: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: logoUrl
              ? theme.surface
              : `linear-gradient(135deg, ${theme.gradient[0]}, ${theme.gradient[1]})`,
            transform: `scale(${logoSpring}) rotate(${(1 - logoSpring) * 12}deg)`,
            boxShadow: `0 40px 120px rgba(0,0,0,0.5), 0 0 90px ${theme.accent}55`,
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {logoUrl ? (
            <Img src={logoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: 84,
                color: theme.bg,
              }}
            >
              {productName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: "-0.02em",
            color: theme.text,
            transform: `translateY(${(1 - nameSpring) * 36}px)`,
            opacity: nameSpring,
          }}
        >
          {productName}
        </div>

        <div
          style={{
            fontFamily: BODY_FONT,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: theme.textDim,
            opacity: interpolate(nameSpring, [0, 1], [0, 1]),
          }}
        >
          Available now
        </div>
      </div>
    </AbsoluteFill>
  );
};
