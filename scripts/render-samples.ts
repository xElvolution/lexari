import "dotenv/config";

/**
 * Renders the landing-page gallery by driving the real pipeline through
 * the demo/job machinery locally (worker must be running), then downloads
 * results into public/samples/. Requires Supabase + OPENAI_API_KEY.
 *
 *   npm run render-samples
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { GALLERY } from "../components/landing/Gallery";
import { createJob, getJob } from "../lib/jobs";
import { RENDERS_BUCKET, supabase } from "../lib/supabase";

async function main() {
  for (const item of GALLERY) {
    console.log(`[samples] queueing ${item.id} (${item.template})`);
    const job = await createJob({
      template: item.template,
      input: item.input,
      payment: null,
      demo: false, // clean 1080p, no watermark — these are showcase assets
    });

    // poll
    for (;;) {
      const j = await getJob(job.id);
      if (!j) throw new Error("job vanished");
      if (j.status === "done") break;
      if (j.status === "failed") throw new Error(`${item.id} failed: ${j.error}`);
      process.stdout.write(`\r[samples] ${item.id}: ${j.status} ${j.progress}%   `);
      await new Promise((r) => setTimeout(r, 8000));
    }

    const { data, error } = await supabase()
      .storage.from(RENDERS_BUCKET)
      .download(`${job.id}.mp4`);
    if (error || !data) throw new Error(`download failed: ${error?.message}`);
    const out = path.join(process.cwd(), "public", "samples", `${item.id}.mp4`);
    await writeFile(out, Buffer.from(await data.arrayBuffer()));
    console.log(`\n[samples] ✓ ${out}`);
  }
  console.log("[samples] all gallery videos rendered");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
