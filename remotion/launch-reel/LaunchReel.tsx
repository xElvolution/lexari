import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LaunchReelProps } from "@/remotion/props";
import { makeTheme } from "@/remotion/shared/theme";
import { Backdrop } from "@/remotion/shared/Backdrop";
import { Captions } from "@/remotion/shared/Captions";
import { Watermark } from "@/remotion/shared/Watermark";
import { Hook } from "./scenes/Hook";
import { Features } from "./scenes/Features";
import { Screenshots } from "./scenes/Screenshots";
import { LogoOutro } from "./scenes/LogoOutro";

const FADE_FRAMES = 8;

export const LaunchReel: React.FC<LaunchReelProps> = (props) => {
  const theme = makeTheme(props.input.brandColor);
  const byId = Object.fromEntries(props.scenes.map((s) => [s.id, s]));

  const scenes: { id: string; node: React.ReactNode }[] = [
    {
      id: "hook",
      node: (
        <Hook
          productName={props.input.productName}
          oneLiner={props.input.oneLiner}
          logoUrl={props.logoUrl}
          theme={theme}
          durationInFrames={byId["hook"]?.durationInFrames ?? 180}
        />
      ),
    },
    {
      id: "features",
      node: (
        <Features
          features={props.input.features}
          theme={theme}
          durationInFrames={byId["features"]?.durationInFrames ?? 90}
        />
      ),
    },
    {
      id: "screenshots",
      node: (
        <Screenshots
          screenshots={props.screenshots}
          theme={theme}
          durationInFrames={byId["screenshots"]?.durationInFrames ?? 90}
        />
      ),
    },
    {
      id: "outro",
      node: (
        <LogoOutro
          productName={props.input.productName}
          logoUrl={props.logoUrl}
          theme={theme}
        />
      ),
    },
  ];

  return (
    <AbsoluteFill>
      <CameraDrift>
        <Backdrop theme={theme} seed={props.input.productName} />

      {scenes.map(({ id, node }, sceneIndex) => {
        const timing = byId[id];
        if (!timing) return null;
        return (
          <Sequence
            key={id}
            from={timing.from}
            durationInFrames={timing.durationInFrames + FADE_FRAMES}
          >
            <WhipTransition
              durationInFrames={timing.durationInFrames}
              direction={sceneIndex % 2 === 0 ? 1 : -1}
              first={sceneIndex === 0}
            >
              {node}
            </WhipTransition>
          </Sequence>
        );
      })}

      </CameraDrift>
      <Captions pages={props.captionPages} theme={theme} />
      {props.audioUrl && <Audio src={props.audioUrl} />}
      {props.watermark && <Watermark />}
    </AbsoluteFill>
  );
};

/** Global slow dolly + sway so no frame of the film is ever static. */
const CameraDrift: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 210) * 6;
  const breathe = 1.015 + Math.sin(frame / 260) * 0.012;
  return (
    <AbsoluteFill
      style={{ transform: `scale(${breathe}) translateX(${sway}px)` }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Whip-pan transition: the outgoing scene whips off-frame with heavy
 * directional blur while the incoming scene whips in from the opposite
 * side and snaps to focus. Alternates direction per scene.
 */
const WhipTransition: React.FC<{
  durationInFrames: number;
  direction: 1 | -1;
  first: boolean;
  children: React.ReactNode;
}> = ({ durationInFrames, direction, first, children }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const outStart = durationInFrames - FADE_FRAMES;

  // In: arrive from `direction` side (skip for the very first scene —
  // the film opens clean).
  const inX = first
    ? 0
    : interpolate(frame, [0, FADE_FRAMES + 2], [direction * width * 0.55, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  // Out: whip away the same direction so motion reads continuous.
  const outX = interpolate(
    frame,
    [outStart, durationInFrames + FADE_FRAMES],
    [0, -direction * width * 0.55],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = interpolate(
    frame,
    [0, first ? 0.001 : FADE_FRAMES * 0.6, outStart, durationInFrames + FADE_FRAMES],
    [first ? 1 : 0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Directional blur while moving — the "whip".
  const speed = Math.abs(inX) + Math.abs(outX);
  const blur = interpolate(speed, [0, width * 0.3], [0, 26], {
    extrapolateRight: "clamp",
  });
  const squeeze = 1 - Math.min(speed / (width * 2.4), 0.06);

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateX(${inX + outX}px) scaleX(${1 / squeeze}) scaleY(${squeeze})`,
        filter: blur > 0.5 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
