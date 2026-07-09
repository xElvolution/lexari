import type { Caption } from "@remotion/captions";
import type { NarrationScript } from "./script";
import type { CaptionPage } from "./captions";

export const FPS = 30;
const SCENE_BREATH_MS = 300;
const OUTRO_TAIL_SEC = 2.5;

export interface SceneTiming {
  id: string;
  from: number; // frame
  durationInFrames: number;
}

export interface Timeline {
  scenes: SceneTiming[];
  durationInFrames: number;
  captionPages: CaptionPage[];
}

/**
 * Derive scene frame ranges from the voiceover word timestamps: each scene
 * ends 300ms after its last spoken word. Alignment is by cumulative word
 * count (whisper tokens are in order; exact text match not required).
 */
export function buildTimeline(opts: {
  script: NarrationScript;
  captions: Caption[];
  pages: CaptionPage[];
  audioDurationMs: number;
  maxDurationSec: number;
}): Timeline {
  const words = opts.captions.filter((c) => c.text.trim().length > 0);
  const counts = opts.script.scenes.map(
    (s) => s.voLine.split(/\s+/).filter(Boolean).length,
  );

  const scenes: SceneTiming[] = [];
  let wordIdx = 0;
  let prevEndMs = 0;
  for (let i = 0; i < opts.script.scenes.length; i++) {
    const lastWordIdx = Math.min(
      wordIdx + Math.max(counts[i], 1) - 1,
      words.length - 1,
    );
    const isLast = i === opts.script.scenes.length - 1;
    const endMs = isLast
      ? opts.audioDurationMs + OUTRO_TAIL_SEC * 1000
      : (words[lastWordIdx]?.endMs ?? prevEndMs + 2000) + SCENE_BREATH_MS;
    const from = Math.round((prevEndMs / 1000) * FPS);
    const durationInFrames = Math.max(
      Math.round(((endMs - prevEndMs) / 1000) * FPS),
      FPS, // never below 1s
    );
    scenes.push({ id: opts.script.scenes[i].id, from, durationInFrames });
    prevEndMs = endMs;
    wordIdx = lastWordIdx + 1;
  }

  let durationInFrames =
    scenes[scenes.length - 1].from +
    scenes[scenes.length - 1].durationInFrames;

  const maxFrames = opts.maxDurationSec * FPS;
  if (durationInFrames > maxFrames) {
    // Word budget should make this unreachable; clamp defensively and log loudly.
    console.error(
      `[timeline] duration ${durationInFrames}f exceeds cap ${maxFrames}f — clamping`,
    );
    const scale = maxFrames / durationInFrames;
    let acc = 0;
    for (const s of scenes) {
      s.from = Math.round(acc);
      s.durationInFrames = Math.max(Math.round(s.durationInFrames * scale), FPS);
      acc = s.from + s.durationInFrames;
    }
    durationInFrames = maxFrames;
  }

  return { scenes, durationInFrames, captionPages: opts.pages };
}

/** Fixed animation-driven timeline for narration-free stat clips. */
export function silentStatTimeline(statCount: number): Timeline {
  const titleSec = 2.2;
  const perStatSec = 1.6;
  const outroSec = 2.0;
  const totalSec = Math.min(titleSec + statCount * perStatSec + outroSec, 20);
  const titleFrames = Math.round(titleSec * FPS);
  const outroFrames = Math.round(outroSec * FPS);
  const totalFrames = Math.round(totalSec * FPS);
  return {
    scenes: [
      { id: "intro", from: 0, durationInFrames: titleFrames },
      {
        id: "numbers",
        from: titleFrames,
        durationInFrames: totalFrames - titleFrames - outroFrames,
      },
      {
        id: "outro",
        from: totalFrames - outroFrames,
        durationInFrames: outroFrames,
      },
    ],
    durationInFrames: totalFrames,
    captionPages: [],
  };
}
