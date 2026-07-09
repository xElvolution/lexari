import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Tiny static server over tmp/ so the headless-Chrome renderer can load
 * per-job assets (screenshots, logo, voiceover) via plain HTTP URLs.
 * Bound to loopback only — never exposed publicly.
 */

export const ASSETS_PORT = 8791;

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

export function tmpRoot(): string {
  return path.join(process.cwd(), "tmp");
}

export function assetUrl(jobId: string, file: string): string {
  return `http://127.0.0.1:${ASSETS_PORT}/${jobId}/${file}`;
}

export function startAssetsServer(): void {
  const root = tmpRoot();
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const filePath = path.normalize(path.join(root, url));
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404).end("not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(res);
  });
  server.listen(ASSETS_PORT, "127.0.0.1");
}
