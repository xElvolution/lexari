import path from "node:path";
import { existsSync } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { ingestImages } from "@/lib/assets";
import { sha256File } from "@/lib/hash";
import { completeJob, updateProgress } from "@/lib/jobs";
import { buildAndStoreReceipt } from "@/lib/payments/receipt";
import { putFileFrom } from "@/lib/storage";
import {
  DURATION_MAX_SEC,
  TEMPLATES,
  type AppTourInput,
  type Job,
  type LaunchReelInput,
  type StatClipInput,
} from "@/lib/schemas";
import {
  appTourScript,
  launchReelScript,
  statClipScript,
} from "@/pipeline/script";
import { synthesizeVoiceover, voiceoverPath } from "@/pipeline/tts";
import { captionsForVoiceover } from "@/pipeline/captions";
import {
  FPS,
  buildTimeline,
  silentStatTimeline,
  type Timeline,
} from "@/pipeline/timeline";
import { captureAppTour } from "@/pipeline/capture";
import { renderComposition } from "@/pipeline/render";
import { assetUrl, tmpRoot } from "./assets-server";
import type {
  AppTourProps,
  LaunchReelProps,
  StatClipProps,
  TourCaption,
} from "@/remotion/props";

/**
 * Full pipeline for one claimed job:
 * assets → script → TTS → whisper captions → timeline → render → upload → receipt.
 * Progress: 0-15 prep, 15-25 voice, 25-90 render, 90-100 publish.
 */
export async function processJob(job: Job): Promise<void> {
  const jobDir = path.join(tmpRoot(), job.id);
  const t = TEMPLATES[job.template];

  try {
    const props =
      job.template === "launch-reel"
        ? await prepareLaunchReel(job, jobDir)
        : job.template === "app-tour"
          ? await prepareAppTour(job, jobDir)
          : await prepareStatClip(job, jobDir);
    await updateProgress(job.id, 25);

    const outPath = path.join(jobDir, "out.mp4");
    const hasAudio =
      "audioUrl" in props && props.audioUrl !== null
        ? voiceoverPathIfExists(jobDir)
        : null;
    const { durationInFrames } = await renderComposition({
      compositionId: t.compositionId,
      inputProps: props as unknown as Record<string, unknown>,
      outPath,
      audioPath: hasAudio,
      scale: job.demo ? 2 / 3 : 1, // demo renders at 720p
      onProgress: (pct) => updateProgress(job.id, 25 + pct * 0.65),
    });
    await updateProgress(job.id, 92);

    const [outputHash, { size: outputBytes }] = await Promise.all([
      sha256File(outPath),
      stat(outPath),
    ]);

    const outputPath = `renders/${job.id}.mp4`;
    await putFileFrom(outputPath, outPath);

    const { path: receiptPath } = await buildAndStoreReceipt({
      job,
      outputHash,
      outputBytes,
      durationInFrames,
      props,
    });

    await completeJob(job.id, {
      output_path: outputPath,
      output_hash: outputHash,
      receipt_path: receiptPath,
    });
  } finally {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}

function voiceoverPathIfExists(jobDir: string): string | null {
  const p = voiceoverPath(jobDir);
  return existsSync(p) ? p : null;
}

const INTRO_FRAMES = 66;
const OUTRO_FRAMES = 72;

async function prepareAppTour(job: Job, jobDir: string): Promise<AppTourProps> {
  const input = job.input as AppTourInput;

  // 1. Record the live walkthrough (0-45% progress).
  const capture = await captureAppTour({
    input,
    jobDir,
    onProgress: (pct) => updateProgress(job.id, 5 + pct * 0.4),
  });
  const footageSec = capture.durationMs / 1000;
  const footageFrames = Math.max(Math.round(footageSec * FPS), FPS);

  // Copy footage where the render's asset server can serve it.
  const { copyFile } = await import("node:fs/promises");
  await copyFile(capture.mp4Path, path.join(jobDir, "tour.mp4"));

  // 2. Narrate + caption, fitted to the footage length.
  let audioUrl: string | null = null;
  let captionPages: AppTourProps["captionPages"] = [];
  if (input.narrate) {
    const script = await appTourScript({
      productName: input.productName,
      tagline: input.tagline,
      stepCaptions: capture.steps
        .map((s) => s.caption)
        .filter((c): c is string => Boolean(c)),
      footageSec,
      tone: input.tone,
    });
    await synthesizeVoiceover({
      jobDir,
      text: script.fullVoiceover,
      voice: input.voice,
      tone: input.tone,
    });
    const caps = await captionsForVoiceover({
      wavPath: voiceoverPath(jobDir),
      knownScript: script.fullVoiceover,
    });
    captionPages = caps.pages;
    audioUrl = assetUrl(job.id, "voiceover.wav");
    await updateProgress(job.id, 22);
  }

  // 3. Step-caption chips timed to when each step happened in the footage.
  const stepCaptions: TourCaption[] = capture.steps
    .map((s, i) => {
      const next = capture.steps[i + 1];
      return {
        text: s.caption ?? "",
        fromFrame: INTRO_FRAMES + Math.round((s.atMs / 1000) * FPS),
        toFrame:
          INTRO_FRAMES +
          Math.round(((next ? next.atMs : capture.durationMs) / 1000) * FPS),
      };
    })
    .filter((c) => c.text);

  return {
    input,
    footageUrl: assetUrl(job.id, "tour.mp4"),
    introFrames: INTRO_FRAMES,
    footageFrames,
    outroFrames: OUTRO_FRAMES,
    stepCaptions,
    captionPages,
    audioUrl,
    durationInFrames: INTRO_FRAMES + footageFrames + OUTRO_FRAMES,
    watermark: job.demo,
  };
}

async function prepareLaunchReel(
  job: Job,
  jobDir: string,
): Promise<LaunchReelProps> {
  const input = job.input as LaunchReelInput;

  const screenshots = await ingestImages(jobDir, input.screenshots, "shot");
  const logos = input.logoUrl
    ? await ingestImages(jobDir, [input.logoUrl], "logo")
    : [];
  await updateProgress(job.id, 10);

  const script = await launchReelScript(input);
  await synthesizeVoiceover({
    jobDir,
    text: script.fullVoiceover,
    voice: input.voice,
    tone: input.tone,
  });
  await updateProgress(job.id, 18);

  const { captions, pages, audioDurationMs } = await captionsForVoiceover({
    wavPath: voiceoverPath(jobDir),
    knownScript: script.fullVoiceover,
  });

  const timeline = buildTimeline({
    script,
    captions,
    pages,
    audioDurationMs,
    maxDurationSec: DURATION_MAX_SEC[input.duration],
  });

  return {
    input,
    scenes: timeline.scenes,
    captionPages: timeline.captionPages,
    screenshots: screenshots.map((s) => ({
      url: assetUrl(job.id, s.file),
      width: s.width,
      height: s.height,
      aspect: s.aspect,
    })),
    logoUrl: logos.length > 0 ? assetUrl(job.id, logos[0].file) : null,
    audioUrl: assetUrl(job.id, "voiceover.wav"),
    durationInFrames: timeline.durationInFrames,
    watermark: job.demo,
  };
}

async function prepareStatClip(
  job: Job,
  jobDir: string,
): Promise<StatClipProps> {
  const input = job.input as StatClipInput;

  let timeline: Timeline;
  let audioUrl: string | null = null;

  if (input.narrate) {
    const script = await statClipScript(input);
    await synthesizeVoiceover({
      jobDir,
      text: script.fullVoiceover,
      voice: input.voice,
      tone: "bold",
    });
    const { captions, pages, audioDurationMs } = await captionsForVoiceover({
      wavPath: voiceoverPath(jobDir),
      knownScript: script.fullVoiceover,
    });
    timeline = buildTimeline({
      script,
      captions,
      pages,
      audioDurationMs,
      maxDurationSec: TEMPLATES["stat-clip"].maxDurationSec,
    });
    audioUrl = assetUrl(job.id, "voiceover.wav");
  } else {
    timeline = silentStatTimeline(input.stats.length);
  }

  return {
    input,
    scenes: timeline.scenes,
    captionPages: timeline.captionPages,
    audioUrl,
    durationInFrames: timeline.durationInFrames,
    watermark: job.demo,
  };
}
