import "dotenv/config";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { captureAppTour } from "../pipeline/capture";
import { renderComposition } from "../pipeline/render";
import { FPS } from "../pipeline/timeline";
import type { AppTourInput } from "../lib/schemas";
import type { AppTourProps, TourCaption } from "../remotion/props";

/**
 * End-to-end App Tour preview WITHOUT the DB/worker: capture a live URL,
 * build the composition props, render the finished video (intro card +
 * framed footage + step-caption chips + outro). Narration is skipped
 * unless OPENAI_API_KEY is set. Footage is embedded via public/.
 */
const INTRO = 66;
const OUTRO = 72;

async function main() {
  const url = process.argv[2] ?? "http://localhost:3000";
  const jobDir = path.join(process.cwd(), "tmp", "preview-tour");
  await mkdir(jobDir, { recursive: true });

  const input: AppTourInput = {
    productName: "RenderReel",
    url,
    steps: [
      { action: "wait", caption: "The studio that agents hire", waitMs: 1500 },
      { action: "scroll", selector: "#gallery", caption: "Cinematic templates", waitMs: 1500 },
      { action: "scroll", selector: "#agents", caption: "Callable from any agent", waitMs: 1500 },
      { action: "scroll", selector: "#pricing", caption: "Priced per render", waitMs: 1500 },
      { action: "scroll", selector: "#try", caption: "Render one free", waitMs: 1300 },
    ],
    brandColor: "#6C5CE7",
    tagline: "The motion studio that agents hire",
    narrate: false,
    voice: "nova",
    tone: "friendly",
  };

  console.log("[tour] capturing", url);
  const capture = await captureAppTour({
    input,
    jobDir,
    onProgress: (p) => process.stdout.write(`\r[tour] capture ${Math.round(p)}%   `),
  });
  console.log(`\n[tour] footage ${(capture.durationMs / 1000).toFixed(1)}s`);

  // Serve the footage from public/ so the Remotion bundle can load it.
  await copyFile(capture.mp4Path, path.join(process.cwd(), "public", "tour-sample.mp4"));

  const footageFrames = Math.max(Math.round((capture.durationMs / 1000) * FPS), FPS);
  const stepCaptions: TourCaption[] = capture.steps
    .map((s, i) => {
      const next = capture.steps[i + 1];
      return {
        text: s.caption ?? "",
        fromFrame: INTRO + Math.round((s.atMs / 1000) * FPS),
        toFrame:
          INTRO + Math.round(((next ? next.atMs : capture.durationMs) / 1000) * FPS),
      };
    })
    .filter((c) => c.text);

  const props: AppTourProps = {
    input,
    footageUrl: "tour-sample.mp4", // staticFile-relative; resolved in composition
    introFrames: INTRO,
    footageFrames,
    outroFrames: OUTRO,
    stepCaptions,
    captionPages: [],
    audioUrl: null,
    durationInFrames: INTRO + footageFrames + OUTRO,
    watermark: false,
  };

  const outPath = path.join(process.cwd(), "tmp", "preview", "app-tour.mp4");
  await mkdir(path.dirname(outPath), { recursive: true });
  console.log(`[tour] rendering ${props.durationInFrames} frames…`);
  await renderComposition({
    compositionId: "AppTour",
    inputProps: props as unknown as Record<string, unknown>,
    outPath,
    scale: 0.667,
    onProgress: (p) => process.stdout.write(`\r[tour] render ${p}%   `),
  });
  console.log(`\n[tour] ✓ ${outPath}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
