import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import {
  appTourFixture,
  launchReelFixture,
  statClipFixture,
} from "../remotion/fixtures";

/** Render key frames of both compositions to PNGs for visual review. */
async function main() {
  const outDir = path.join(process.cwd(), "tmp", "stills");
  mkdirSync(outDir, { recursive: true });

  console.log("bundling…");
  const serveUrl = await bundle({
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

  const shots: { comp: string; frame: number; props: unknown }[] = [
    { comp: "LaunchReel", frame: 80, props: launchReelFixture },
    { comp: "LaunchReel", frame: 330, props: launchReelFixture },
    { comp: "LaunchReel", frame: 620, props: launchReelFixture },
    { comp: "LaunchReel", frame: 760, props: launchReelFixture },
    { comp: "StatClip", frame: 40, props: statClipFixture },
    { comp: "StatClip", frame: 200, props: statClipFixture },
    { comp: "AppTour", frame: 30, props: appTourFixture },
    { comp: "AppTour", frame: 180, props: appTourFixture },
  ];

  for (const shot of shots) {
    const composition = await selectComposition({
      serveUrl,
      id: shot.comp,
      inputProps: shot.props as Record<string, unknown>,
    });
    const out = path.join(outDir, `${shot.comp}-${shot.frame}.png`);
    await renderStill({
      composition,
      serveUrl,
      output: out,
      frame: shot.frame,
      inputProps: shot.props as Record<string, unknown>,
    });
    console.log("rendered", out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
