import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local file storage with HMAC-signed download URLs. Rendered MP4s and
 * receipts live on the render box's disk (a Fly volume in production) —
 * no storage vendor needed alongside Neon.
 *
 * DATA_DIR: where files live (default ./data)
 * FILES_SECRET: HMAC key for signed URLs
 */

export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

export function dataDir(): string {
  return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

function secret(): string {
  const s = process.env.FILES_SECRET;
  if (!s) throw new Error("FILES_SECRET is not set");
  return s;
}

function sign(relPath: string, exp: number): string {
  return createHmac("sha256", secret())
    .update(`${relPath}:${exp}`)
    .digest("hex");
}

/** Store a buffer under a relative path like "renders/{id}.mp4". */
export async function putFile(relPath: string, data: Buffer | string) {
  const abs = path.join(dataDir(), relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
}

/** Move an existing on-disk file into storage. */
export async function putFileFrom(relPath: string, srcAbsPath: string) {
  const abs = path.join(dataDir(), relPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await copyFile(srcAbsPath, abs);
}

export function absolutePath(relPath: string): string {
  const abs = path.normalize(path.join(dataDir(), relPath));
  if (!abs.startsWith(dataDir())) throw new Error("path escapes DATA_DIR");
  return abs;
}

/** Time-limited signed URL served by /api/files/[...path]. */
export function signedUrl(relPath: string, ttlSeconds = SIGNED_URL_TTL_SECONDS): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = sign(relPath, exp);
  return `${base}/api/files/${relPath}?exp=${exp}&sig=${sig}`;
}

export function verifySignature(relPath: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = sign(relPath, exp);
  if (expected.length !== sig.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
