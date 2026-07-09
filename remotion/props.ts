import type { LaunchReelInput, StatClipInput } from "@/lib/schemas";
import type { SceneTiming } from "@/pipeline/timeline";
import type { CaptionPage } from "@/pipeline/captions";
import type { AspectClass } from "@/lib/assets";

/** Everything a composition needs arrives precomputed via inputProps —
 * compositions are pure functions of these props (deterministic renders). */

export interface ScreenshotAsset {
  url: string;
  width: number;
  height: number;
  aspect: AspectClass;
}

export interface LaunchReelProps {
  input: LaunchReelInput;
  scenes: SceneTiming[];
  captionPages: CaptionPage[];
  screenshots: ScreenshotAsset[];
  logoUrl: string | null;
  audioUrl: string | null;
  durationInFrames: number;
  watermark: boolean;
}

export interface StatClipProps {
  input: StatClipInput;
  scenes: SceneTiming[];
  captionPages: CaptionPage[];
  audioUrl: string | null;
  durationInFrames: number;
  watermark: boolean;
}
