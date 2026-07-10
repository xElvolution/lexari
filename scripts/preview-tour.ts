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
      { action: "wait", caption: "The motion studio that agents hire", waitMs: 2400 },
      { action: "hover", selector: "a[href='#try']", caption: "Start with one free render", waitMs: 2200 },
      { action: "scroll", selector: "#gallery", caption: "Cinematic templates, made by an agent", waitMs: 2600 },
      { action: "click", selector: "text={ input }", caption: "Every sample shows its exact input", waitMs: 3000 },
      { action: "scroll", selector: "#agents", caption: "Callable from any AI agent", waitMs: 2400 },
      { action: "click", selector: "text=HTTP + x402", caption: "Or over plain HTTP with x402", waitMs: 3000 },
      { action: "click", selector: "text=In an agent loop", caption: "Agents render in a loop", waitMs: 3000 },
      { action: "scroll", selector: "#pricing", caption: "Priced per render, not per seat", waitMs: 2800 },
      { action: "scroll", selector: "#try", caption: "Now try it yourself", waitMs: 2200 },
      { action: "type", selector: "input[placeholder='Product name']", text: "Vaultline", caption: "Name your product", waitMs: 1600 },
      { action: "type", selector: "input[placeholder='One-liner — what does it do?']", text: "Every yield strategy, one dashboard.", caption: "Add a one-liner", waitMs: 1600 },
      { action: "type", selector: "input[placeholder='Feature 1']", text: "Live APY across 40+ protocols", caption: "List the features", waitMs: 1400 },
      { action: "type", selector: "input[placeholder='Feature 2']", text: "One-click position migration", caption: "", waitMs: 1200 },
      { action: "type", selector: "input[placeholder='Feature 3']", text: "Risk scoring on every vault", caption: "", waitMs: 1200 },
      { action: "hover", selector: "input[type='color']", caption: "Pick your brand color", waitMs: 2200 },
      { action: "hover", selector: "button[type='submit']", caption: "And render your launch film", waitMs: 2600 },
      { action: "scroll", selector: "#receipts", caption: "Every render leaves a verifiable receipt", waitMs: 2800 },
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
