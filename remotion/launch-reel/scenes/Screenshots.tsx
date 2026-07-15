import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ScreenshotAsset } from "@/remotion/props";
import type { Theme } from "@/remotion/shared/theme";
import { DeviceFrame } from "@/remotion/shared/DeviceFrame";
import { LightSweep } from "@/remotion/shared/Backdrop";
import { Shake, SpeedStreaks } from "@/remotion/shared/Impact";

/** 3D-tilted device with a fading floor reflection — the "showcase" look. */
const Reflected: React.FC<{
  asset: ScreenshotAsset;
  theme: Theme;
  maxWidth: number;
  maxHeight: number;
  tilt: number;
  children?: never;
}> = ({ asset, theme, maxWidth, maxHeight, tilt }) => (
  <div style={{ perspective: 1400 }}>
    <div style={{ transform: `rotateY(${tilt}deg) rotateX(${Math.abs(tilt) * 0.25}deg)` }}>
      <DeviceFrame asset={asset} theme={theme} maxWidth={maxWidth} maxHeight={maxHeight} />
      {/* floor reflection */}
      <div
        style={{
          transform: "scaleY(-1)",
          marginTop: 6,
          opacity: 0.22,
          maskImage: "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.85) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 55%, rgba(0,0,0,0.85) 100%)",
          filter: "blur(1.5px)",
          pointerEvents: "none",
        }}
      >
        <DeviceFrame asset={asset} theme={theme} maxWidth={maxWidth} maxHeight={maxHeight} />
      </div>
    </div>
  </div>
);

/**
 * Scene 3 — the product in action.
 * 1 shot: slow cinematic push with drift.
 * 2-3 shots: staggered fan layout.
 * 4+ shots (or long scenes): sequential showcase — each shot gets its own
 * push-in beat, crossfading to the next.
 */
export const Screenshots: React.FC<{
  screenshots: ScreenshotAsset[];
  theme: Theme;
  durationInFrames: number;
}> = ({ screenshots, theme, durationInFrames }) => {
  const { fps } = useVideoConfig();
  const secondsPerShot = durationInFrames / fps / screenshots.length;

  // Sequential showcase when there are many shots or plenty of time per shot.
  if (screenshots.length >= 4 || (screenshots.length > 1 && secondsPerShot > 6)) {
    return (
      <Sequential
        screenshots={screenshots}
        theme={theme}
        durationInFrames={durationInFrames}
      />
    );
  }

  if (screenshots.length === 1) {
    return (
      <SinglePush
        shot={screenshots[0]}
        theme={theme}
        durationInFrames={durationInFrames}
      />
    );
  }

  return <Fan screenshots={screenshots} theme={theme} />;
};

const SinglePush: React.FC<{
  shot: ScreenshotAsset;
  theme: Theme;
  durationInFrames: number;
}> = ({ shot, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Continuous push with a punch-in beat at the scene's midpoint —
  // the "let me show you this part" moment.
  const midStart = durationInFrames * 0.45;
  const midEnd = durationInFrames * 0.8;
  // Short scenes: keep the ramp inside [midStart, midEnd] so the input
  // range stays strictly monotonic (18-frame ramp overshoots below ~52f).
  const ramp = Math.min(18, (midEnd - midStart) / 2);
  const punch = interpolate(
    frame,
    [midStart, midStart + ramp, midEnd, midEnd + 14],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const push =
    interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
      extrapolateRight: "clamp",
    }) *
    (1 + punch * 0.14);
  const panY = punch * -46;
  const drift = interpolate(frame, [0, durationInFrames], [10, -10], {
    extrapolateRight: "clamp",
  });
  const tilt = interpolate(frame, [0, durationInFrames], [-9, 4], {
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 110, mass: 0.9 } });
  // Arc fly-in: sweeps in from bottom-right along a curve, rotating to rest.
  const arcX = (1 - enter) * 620;
  const arcY = (1 - enter) * 340 - Math.sin(enter * Math.PI) * 90;
  const arcRot = (1 - enter) * 16;
  const landAt = 11; // ~where the spring visually settles
  return (
    <Shake delay={landAt} strength={10} durationInFrames={12} seed="shot-land">
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <SpeedStreaks delay={0} durationInFrames={landAt + 4} angle={-24} color={theme.accentSoft} />
        <div
          style={{
            transform: `translate(${arcX}px, ${arcY + drift + panY}px) rotate(${arcRot}deg) scale(${push * (0.86 + enter * 0.14)})`,
            opacity: interpolate(enter, [0, 0.25, 1], [0, 1, 1]),
            filter: enter < 0.65 ? `blur(${(1 - enter) * 8}px)` : undefined,
          }}
        >
          <Reflected
            asset={shot}
            theme={theme}
            maxWidth={1400}
            maxHeight={700}
            tilt={tilt}
          />
        </div>
        <LightSweep delay={landAt + 3} durationInFrames={32} />
      </AbsoluteFill>
    </Shake>
  );
};

const Fan: React.FC<{ screenshots: ScreenshotAsset[]; theme: Theme }> = ({
  screenshots,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layouts =
    screenshots.length === 2
      ? [
          { x: -330, y: 10, rot: -4, scale: 0.94, z: 1 },
          { x: 330, y: -10, rot: 4, scale: 0.94, z: 2 },
        ]
      : [
          { x: -480, y: 26, rot: -6, scale: 0.82, z: 1 },
          { x: 0, y: -14, rot: 0, scale: 1.0, z: 3 },
          { x: 480, y: 26, rot: 6, scale: 0.82, z: 2 },
        ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <SpeedStreaks delay={2} durationInFrames={16} angle={10} color={theme.accentSoft} count={10} />
      {screenshots.map((shot, i) => {
        const l = layouts[i];
        const s = spring({
          frame: frame - 4 - i * 7,
          fps,
          config: { damping: 14, stiffness: 120, mass: 0.9 },
        });
        const idle = Math.sin((frame + i * 40) / 55) * 5;
        // Alternate arc directions so the shots cross paths on the way in.
        const dir = i % 2 === 0 ? -1 : 1;
        const arcX = (1 - s) * 520 * dir;
        const arcY = (1 - s) * 220 - Math.sin(s * Math.PI) * 60;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              zIndex: l.z,
              transform: `translate(${l.x + arcX}px, ${l.y + arcY + idle}px) rotate(${l.rot * s + (1 - s) * 12 * dir}deg) scale(${l.scale * (0.86 + s * 0.14)})`,
              opacity: interpolate(s, [0, 0.3, 1], [0, 1, 1]),
              filter: s < 0.6 ? `blur(${(1 - s) * 7}px)` : undefined,
            }}
          >
            <DeviceFrame
              asset={shot}
              theme={theme}
              maxWidth={screenshots.length === 2 ? 860 : 760}
              maxHeight={720}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** One beat per screenshot: push-in + drift, crossfade between beats. */
const Sequential: React.FC<{
  screenshots: ScreenshotAsset[];
  theme: Theme;
  durationInFrames: number;
}> = ({ screenshots, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const per = durationInFrames / screenshots.length;
  // Cap the crossfade below per/2 so [0, FADE, per - FADE, per] stays
  // strictly monotonic even on very short beats.
  const FADE = Math.min(10, per / 2.5);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {screenshots.map((shot, i) => {
        const start = i * per;
        const local = frame - start;
        if (local < -FADE || local > per + FADE) return null;
        const opacity = interpolate(
          local,
          [0, FADE, per - FADE, per],
          [i === 0 ? 1 : 0, 1, 1, i === screenshots.length - 1 ? 1 : 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const push = interpolate(local, [0, per], [0.95, 1.07], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        // Each beat slides in along its tilt direction instead of only fading.
        const slideDir = i % 2 === 0 ? -1 : 1;
        const slideIn = interpolate(local, [0, FADE + 4], [slideDir * 240, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const drift = interpolate(local, [0, per], [12, -12], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const tilt = interpolate(local, [0, per], [i % 2 === 0 ? -10 : 10, i % 2 === 0 ? 3 : -3], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              opacity,
              transform: `scale(${push}) translate(${slideIn}px, ${drift}px)`,
              filter: local < FADE ? `blur(${Math.max(0, (1 - local / FADE) * 6)}px)` : undefined,
            }}
          >
            <Reflected
              asset={shot}
              theme={theme}
              maxWidth={1400}
              maxHeight={700}
              tilt={tilt}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
