import "dotenv/config";

/**
 * Direct-pipeline preview: renders a fully voiced, caption-synced Launch
 * Reel WITHOUT the DB/worker/payment machinery. Only OPENAI_API_KEY is
 * required. Use for local quality iteration and producing demo assets
 * before infra is up.
 *
 *   npm run preview [path/to/input.json]
 *
 * Defaults to fixtures/self.json (RenderReel's own launch reel).
 */

import path from "node:path";
import { mkdir, readFile, rm } from "node:fs/promises";
import { LaunchReelInput, DURATION_MAX_SEC } from "../lib/schemas";
import { ingestImages } from "../lib/assets";
import { launchReelScript } from "../pipeline/script";
import { synthesizeVoiceover, voiceoverPath } from "../pipeline/tts";
import { captionsForVoiceover } from "../pipeline/captions";
import { buildTimeline } from "../pipeline/timeline";
import { renderComposition } from "../pipeline/render";
import { startAssetsServer, assetUrl, tmpRoot } from "../worker/assets-server";
import type { LaunchReelProps } from "../remotion/props";

const JOB_ID = "preview";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required (script + voiceover). Add it to .env.local or .env");
    process.exit(1);
  }

  const inputPath = process.argv[2] ?? path.join("fixtures", "self.json");
  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const input = LaunchReelInput.parse(raw);
  console.log(
    `[preview] ${input.productName} · duration=${input.duration} (≤${DURATION_MAX_SEC[input.duration]}s) · ${input.features.length} features · ${input.screenshots.length} screenshots`,
  );

  const jobDir = path.join(tmpRoot(), JOB_ID);
  await rm(jobDir, { recursive: true, force: true });
  await mkdir(jobDir, { recursive: true });
  startAssetsServer();

  console.log("[preview] 1/5 ingesting assets…");
  const screenshots = await ingestImages(jobDir, input.screenshots, "shot");
  const logos = input.logoUrl
    ? await ingestImages(jobDir, [input.logoUrl], "logo")
    : [];

  console.log("[preview] 2/5 writing narration script…");
  const script = await launchReelScript(input);
  for (const s of script.scenes) console.log(`   ${s.id}: ${s.voLine}`);

  console.log("[preview] 3/5 synthesizing voiceover…");
  await synthesizeVoiceover({
    jobDir,
    text: script.fullVoiceover,
    voice: input.voice,
    tone: input.tone,
  });

  console.log("[preview] 4/5 timing captions…");
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
  console.log(
    `   audio ${(audioDurationMs / 1000).toFixed(1)}s → ${timeline.durationInFrames} frames`,
  );

  const props: LaunchReelProps = {
    input,
    scenes: timeline.scenes,
    captionPages: timeline.captionPages,
    screenshots: screenshots.map((s) => ({
      url: assetUrl(JOB_ID, s.file),
      width: s.width,
      height: s.height,
      aspect: s.aspect,
    })),
    logoUrl: logos.length > 0 ? assetUrl(JOB_ID, logos[0].file) : null,
    audioUrl: assetUrl(JOB_ID, "voiceover.wav"),
    durationInFrames: timeline.durationInFrames,
    watermark: false,
  };

  console.log("[preview] 5/5 rendering (this is the slow part)…");
  const outPath = path.join("tmp", "preview", `${input.productName.toLowerCase().replace(/\s+/g, "-")}-voiced.mp4`);
  await mkdir(path.dirname(outPath), { recursive: true });
  const started = Date.now();
  await renderComposition({
    compositionId: "LaunchReel",
    inputProps: props as unknown as Record<string, unknown>,
    outPath,
    audioPath: voiceoverPath(jobDir),
    onProgress: (pct) => process.stdout.write(`\r   render ${pct}%   `),
  });
  console.log(
    `\n[preview] ✓ ${outPath} in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("\n[preview] failed:", e);
  process.exit(1);
});
