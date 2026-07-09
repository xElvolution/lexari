import React from "react";
import { Composition } from "remotion";
import { LaunchReel } from "./launch-reel/LaunchReel";
import { StatClip } from "./stat-clip/StatClip";
import type { LaunchReelProps, StatClipProps } from "./props";
import { FPS } from "@/pipeline/timeline";
import {
  launchReelFixture,
  statClipFixture,
} from "./fixtures";

/**
 * Duration always comes from precomputed inputProps (the worker's timeline
 * step); the fixtures make Remotion Studio usable standalone.
 */
export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="LaunchReel"
        component={LaunchReel as unknown as React.ComponentType<Record<string, unknown>>}
        width={1920}
        height={1080}
        fps={FPS}
        defaultProps={launchReelFixture as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames:
            (props as unknown as LaunchReelProps).durationInFrames,
        })}
      />
      <Composition
        id="StatClip"
        component={StatClip as unknown as React.ComponentType<Record<string, unknown>>}
        width={1920}
        height={1080}
        fps={FPS}
        defaultProps={statClipFixture as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames:
            (props as unknown as StatClipProps).durationInFrames,
        })}
      />
    </>
  );
};
