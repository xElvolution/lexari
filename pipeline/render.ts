import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

/**
 * Remotion rendering. The webpack bundle is built once per worker process
 * (~30s) and reused for every job; renderMedia is the multi-minute
 * CPU-bound step.
 */

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
  scale?: number;
  onProgress?: (pct: number) => void;
}): Promise<{ durationInFrames: number }> {
  const serveUrl = await getBundle();

  const composition = await selectComposition({
    serveUrl,
    id: opts.compositionId,
    inputProps: opts.inputProps,
  });

  const isLinux = process.platform === "linux";
  let lastReported = -1;

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: opts.outPath,
    inputProps: opts.inputProps,
    imageFormat: "jpeg",
    jpegQuality: 90,
    scale: opts.scale ?? 1,
    concurrency: Math.max(os.cpus().length - 1, 1),
    chromiumOptions: isLinux ? { gl: "angle-egl" } : {},
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct !== lastReported && opts.onProgress) {
        lastReported = pct;
        opts.onProgress(pct);
      }
    },
  });

  return { durationInFrames: composition.durationInFrames };
}
