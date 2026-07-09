import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_WIDTH = 400;
const FETCH_TIMEOUT_MS = 10_000;

export type AspectClass = "phone" | "desktop" | "square";

export interface IngestedAsset {
  /** Filename inside the job tmp dir, e.g. "shot-0.png" */
  file: string;
  width: number;
  height: number;
  aspect: AspectClass;
}

export function classifyAspect(width: number, height: number): AspectClass {
  const ratio = width / height;
  if (ratio < 0.8) return "phone";
  if (ratio > 1.25) return "desktop";
  return "square";
}

async function fetchImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`fetch ${res.status} for ${url}`);
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      throw new Error(`not an image (${type}): ${url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      throw new Error(`image exceeds 8MB: ${url}`);
    }
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download, validate, and normalize job images into tmp/{jobId}/.
 * Everything is re-encoded to PNG so the renderer never sees a hostile file.
 */
export async function ingestImages(
  jobDir: string,
  urls: string[],
  prefix: string,
): Promise<IngestedAsset[]> {
  await mkdir(jobDir, { recursive: true });
  const out: IngestedAsset[] = [];
  for (let i = 0; i < urls.length; i++) {
    const buf = await fetchImage(urls[i]);
    const img = sharp(buf, { limitInputPixels: 40_000_000 });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new Error(`unreadable image: ${urls[i]}`);
    if (meta.width < MIN_WIDTH) {
      throw new Error(`image too small (min ${MIN_WIDTH}px wide): ${urls[i]}`);
    }
    const file = `${prefix}-${i}.png`;
    // Cap the longest edge at 2200px — plenty for 1080p, keeps render memory sane.
    await img
      .resize(2200, 2200, { fit: "inside", withoutEnlargement: true })
      .png()
      .toFile(path.join(jobDir, file));
    const resized = await sharp(path.join(jobDir, file)).metadata();
    out.push({
      file,
      width: resized.width!,
      height: resized.height!,
      aspect: classifyAspect(resized.width!, resized.height!),
    });
  }
  return out;
}

export async function saveBuffer(jobDir: string, file: string, buf: Buffer) {
  await mkdir(jobDir, { recursive: true });
  await writeFile(path.join(jobDir, file), buf);
}
