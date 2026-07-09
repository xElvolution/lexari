import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
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
      <Backdrop theme={theme} seed={props.input.productName} />

      {scenes.map(({ id, node }) => {
        const timing = byId[id];
        if (!timing) return null;
        return (
          <Sequence
            key={id}
            from={timing.from}
            durationInFrames={timing.durationInFrames + FADE_FRAMES}
          >
            <SceneFade durationInFrames={timing.durationInFrames}>
              {node}
            </SceneFade>
          </Sequence>
        );
      })}

      <Captions pages={props.captionPages} theme={theme} />
      {props.audioUrl && <Audio src={props.audioUrl} />}
      {props.watermark && <Watermark />}
    </AbsoluteFill>
  );
};

const SceneFade: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  return (
    <AbsoluteFill>
      <FadeWrapper durationInFrames={durationInFrames}>{children}</FadeWrapper>
    </AbsoluteFill>
  );
};

const FadeWrapper: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, FADE_FRAMES, durationInFrames - FADE_FRAMES, durationInFrames + FADE_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
