import path from "node:path";
import { mkdir } from "node:fs/promises";
import { renderComposition } from "../pipeline/render";
import {
  extendedLaunchReelFixture,
  launchReelFixture,
  statClipFixture,
} from "../remotion/fixtures";

/**
 * Render a fixture composition to MP4 (uses the darwin ffmpeg fallback
 * automatically). Usage: npm run render-fixture [extended|short|stat] [scale]
 */
const FIXTURES = {
  extended: { comp: "LaunchReel", props: extendedLaunchReelFixture },
  short: { comp: "LaunchReel", props: launchReelFixture },
  stat: { comp: "StatClip", props: statClipFixture },
} as const;

async function main() {
  const which = (process.argv[2] ?? "extended") as keyof typeof FIXTURES;
  const scale = Number(process.argv[3] ?? "0.5");
  const { comp, props } = FIXTURES[which];

  const outPath = path.join("tmp", "preview", `fixture-${which}.mp4`);
  await mkdir(path.dirname(outPath), { recursive: true });

  console.log(
    `[fixture] rendering ${comp} (${which}) — ${props.durationInFrames} frames at scale ${scale}`,
  );
  const started = Date.now();
  await renderComposition({
    compositionId: comp,
    inputProps: props as unknown as Record<string, unknown>,
    outPath,
    scale,
    onProgress: (pct) => process.stdout.write(`\r[fixture] ${pct}%   `),
  });
  console.log(
    `\n[fixture] ✓ ${outPath} in ${Math.round((Date.now() - started) / 1000)}s`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
