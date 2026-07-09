import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import {
  renderFrames,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";

const execFileAsync = promisify(execFile);

/**
 * Remotion rendering. The webpack bundle is built once per worker process
 * (~30s) and reused for every job; the render is the multi-minute
 * CPU-bound step.
 *
 * macOS < 15 fallback: Remotion 4.0.4xx bundles an ffmpeg built for
 * macOS 15+ (dyld AVCaptureDeviceTypeContinuityCamera crash on older
 * systems), so on old Darwin we render a frame sequence and stitch/mux
 * with the portable ffmpeg-static binary instead. Linux (production)
 * always uses renderMedia.
 */

// Darwin kernel 24.x == macOS 15 (Sequoia); older kernels need the fallback.
const needsFfmpegFallback =
  process.platform === "darwin" && parseInt(os.release(), 10) < 24;

let bundlePromise: Promise<string> | null = null;

export function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config.resolve?.alias as Record<string, string>),
            "@": process.cwd(),
          },
        },
      }),
    });
  }
  return bundlePromise;
}

export async function renderComposition(opts: {
  compositionId: string;
  inputProps: Record<string, unknown>;
  outPath: string;
  /** Local WAV to mux in the darwin fallback (renderMedia handles audio itself). */
  audioPath?: string | null;
  scale?: number;
  onProgress?: (pct: number) => void;
}): Promise<{ durationInFrames: number }> {
  const serveUrl = await getBundle();

  const composition = await selectComposition({
    serveUrl,
    id: opts.compositionId,
    inputProps: opts.inputProps,
  });

  const concurrency = Math.max(os.cpus().length - 1, 1);
  let lastReported = -1;
  const report = (progress: number) => {
    const pct = Math.round(progress * 100);
    if (pct !== lastReported && opts.onProgress) {
      lastReported = pct;
      opts.onProgress(pct);
    }
  };

  if (!needsFfmpegFallback) {
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: opts.outPath,
      inputProps: opts.inputProps,
      imageFormat: "jpeg",
      jpegQuality: 90,
      scale: opts.scale ?? 1,
      concurrency,
      chromiumOptions: process.platform === "linux" ? { gl: "angle-egl" } : {},
      onProgress: ({ progress }) => report(progress),
    });
    return { durationInFrames: composition.durationInFrames };
  }

  // ---- darwin < 15 fallback: frames + ffmpeg-static ----
  const seqDir = opts.outPath + ".frames";
  await rm(seqDir, { recursive: true, force: true });
  await mkdir(seqDir, { recursive: true });

  await renderFrames({
    composition,
    serveUrl,
    outputDir: seqDir,
    inputProps: opts.inputProps,
    imageFormat: "jpeg",
    jpegQuality: 90,
    scale: opts.scale ?? 1,
    concurrency,
    onFrameUpdate: (framesRendered) =>
      report((framesRendered / composition.durationInFrames) * 0.92),
    onStart: () => {},
  });

  const ffmpeg = (await import("ffmpeg-static")).default as string;
  const pad = String(composition.durationInFrames - 1).length;
  const args = [
    "-y",
    "-framerate",
    String(composition.fps),
    "-i",
    path.join(seqDir, `element-%0${pad}d.jpeg`),
    ...(opts.audioPath ? ["-i", opts.audioPath] : []),
    "-vf",
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    ...(opts.audioPath ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
    opts.outPath,
  ];
  await execFileAsync(ffmpeg, args, { maxBuffer: 1024 * 1024 * 64 });
  await rm(seqDir, { recursive: true, force: true });
  report(1);

  return { durationInFrames: composition.durationInFrames };
}
