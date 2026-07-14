import "../lib/load-env";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { captureAppTour } from "../pipeline/capture";
import type { AppTourInput } from "../lib/schemas";

/** Records the local landing page to prove the capture engine works. */
async function main() {
  const jobDir = path.join(process.cwd(), "tmp", "capture-test");
  await mkdir(jobDir, { recursive: true });

  const input: AppTourInput = {
    productName: "Lexari",
    url: process.argv[2] ?? "http://localhost:3000",
    steps: [
      { action: "wait", caption: "The motion studio that agents hire", waitMs: 1400 },
      { action: "scroll", selector: "#gallery", caption: "Cinematic templates", waitMs: 1400 },
      { action: "scroll", selector: "#agents", caption: "Call it from any agent", waitMs: 1400 },
      { action: "scroll", selector: "#pricing", caption: "Priced per render", waitMs: 1400 },
      { action: "scroll", selector: "#try", caption: "Try one free", waitMs: 1200 },
    ],
    brandColor: "#6C5CE7",
    tagline: "The motion studio that agents hire",
    narrate: false,
    voice: "nova",
    tone: "friendly",
  };

  console.log("[capture-test] recording", input.url);
  const started = Date.now();
  const result = await captureAppTour({
    input,
    jobDir,
    onProgress: (pct) => process.stdout.write(`\r[capture-test] ${Math.round(pct)}%   `),
  });
  console.log(
    `\n[capture-test] ✓ ${result.mp4Path} — ${(result.durationMs / 1000).toFixed(1)}s in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  console.log("[capture-test] steps:", JSON.stringify(result.steps, null, 2));

  const pub = path.join(process.cwd(), "public", "tour-sample.mp4");
  await copyFile(result.mp4Path, pub);
  console.log("[capture-test] copied to", pub);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
