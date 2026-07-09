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

/**
 * Scene 3 — the product in action. 1 shot: slow cinematic push with
 * parallax tilt. 2-3 shots: staggered fan layout, each springing in.
 */
export const Screenshots: React.FC<{
  screenshots: ScreenshotAsset[];
  theme: Theme;
  durationInFrames: number;
}> = ({ screenshots, theme, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (screenshots.length === 1) {
    const push = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
      extrapolateRight: "clamp",
    });
    const drift = interpolate(frame, [0, durationInFrames], [8, -8], {
      extrapolateRight: "clamp",
    });
    const enter = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
    return (
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            transform: `scale(${push * (0.9 + enter * 0.1)}) translateY(${(1 - enter) * 90 + drift}px)`,
            opacity: enter,
          }}
        >
          <DeviceFrame
            asset={screenshots[0]}
            theme={theme}
            maxWidth={1460}
            maxHeight={780}
          />
        </div>
      </AbsoluteFill>
    );
  }

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
      {screenshots.map((shot, i) => {
        const l = layouts[i];
        const s = spring({
          frame: frame - 4 - i * 7,
          fps,
          config: { damping: 16, stiffness: 95, mass: 0.9 },
        });
        const idle = Math.sin((frame + i * 40) / 55) * 5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              zIndex: l.z,
              transform: `translate(${l.x}px, ${l.y + (1 - s) * 160 + idle}px) rotate(${l.rot * s}deg) scale(${l.scale * (0.88 + s * 0.12)})`,
              opacity: interpolate(s, [0, 0.35, 1], [0, 1, 1]),
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
