import "../lib/load-env";

/**
 * Renders the landing-page gallery by driving the real pipeline through
 * the job machinery locally (worker must be running), then copies results
 * into public/samples/. Requires Neon (DATABASE_URL) + OPENAI_API_KEY.
 *
 *   npm run render-samples
 */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { GALLERY } from "../components/landing/Gallery";
import { createJob, getJob } from "../lib/jobs";
import { absolutePath } from "../lib/storage";

async function main() {
  await mkdir(path.join(process.cwd(), "public", "samples"), {
    recursive: true,
  });

  for (const item of GALLERY) {
    console.log(`[samples] queueing ${item.id} (${item.template})`);
    const job = await createJob({
      template: item.template,
      input: item.input,
      payment: null,
      demo: false, // clean 1080p, no watermark — these are showcase assets
    });

    for (;;) {
      const j = await getJob(job.id);
      if (!j) throw new Error("job vanished");
      if (j.status === "done") break;
      if (j.status === "failed") throw new Error(`${item.id} failed: ${j.error}`);
      process.stdout.write(`\r[samples] ${item.id}: ${j.status} ${j.progress}%   `);
      await new Promise((r) => setTimeout(r, 8000));
    }

    const done = await getJob(job.id);
    const out = path.join(process.cwd(), "public", "samples", `${item.id}.mp4`);
    await copyFile(absolutePath(done!.output_path!), out);
    console.log(`\n[samples] ✓ ${out}`);
  }
  console.log("[samples] all gallery videos rendered");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
