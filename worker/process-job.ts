import path from "node:path";
import { rm, stat } from "node:fs/promises";
import { ingestImages } from "@/lib/assets";
import { sha256File } from "@/lib/hash";
import { completeJob, updateProgress } from "@/lib/jobs";
import { buildAndUploadReceipt } from "@/lib/payments/receipt";
import { RENDERS_BUCKET, supabase } from "@/lib/supabase";
import {
  TEMPLATES,
  type Job,
  type LaunchReelInput,
  type StatClipInput,
} from "@/lib/schemas";
import { launchReelScript, statClipScript } from "@/pipeline/script";
import { synthesizeVoiceover, voiceoverPath } from "@/pipeline/tts";
import { captionsForVoiceover } from "@/pipeline/captions";
import {
  buildTimeline,
  silentStatTimeline,
  type Timeline,
} from "@/pipeline/timeline";
import { renderComposition } from "@/pipeline/render";
import { assetUrl, tmpRoot } from "./assets-server";
import type { LaunchReelProps, StatClipProps } from "@/remotion/props";

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
        : await prepareStatClip(job, jobDir);
    await updateProgress(job.id, 25);

    const outPath = path.join(jobDir, "out.mp4");
    const { durationInFrames } = await renderComposition({
      compositionId: t.compositionId,
      inputProps: props as unknown as Record<string, unknown>,
      outPath,
      scale: job.demo ? 2 / 3 : 1, // demo renders at 720p
      onProgress: (pct) => updateProgress(job.id, 25 + pct * 0.65),
    });
    await updateProgress(job.id, 92);

    const [outputHash, { size: outputBytes }] = await Promise.all([
      sha256File(outPath),
      stat(outPath),
    ]);

    const outputPath = `${job.id}.mp4`;
    const { error } = await supabase()
      .storage.from(RENDERS_BUCKET)
      .upload(outputPath, await fileBuffer(outPath), {
        contentType: "video/mp4",
        upsert: true,
      });
    if (error) throw new Error(`upload failed: ${error.message}`);

    const { path: receiptPath } = await buildAndUploadReceipt({
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

async function fileBuffer(p: string): Promise<Buffer> {
  const { readFile } = await import("node:fs/promises");
  return readFile(p);
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
    maxDurationSec: TEMPLATES["launch-reel"].maxDurationSec,
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
