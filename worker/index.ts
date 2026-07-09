import "dotenv/config";
import { claimNextJob, failJob, reapStaleJobs } from "@/lib/jobs";
import { ensureWhisper } from "@/pipeline/captions";
import { getBundle } from "@/pipeline/render";
import { startAssetsServer } from "./assets-server";
import { processJob } from "./process-job";

/**
 * Render worker: single process, concurrency 1 (renders saturate the CPU).
 * Claims via Postgres FOR UPDATE SKIP LOCKED; a crashed worker's jobs are
 * requeued by the stale-job reaper.
 */

const POLL_MS = 3000;
const REAP_EVERY_TICKS = 20;

async function main() {
  console.log("[worker] booting…");
  startAssetsServer();

  console.log("[worker] warming Remotion bundle…");
  await getBundle();
  console.log("[worker] bundle ready");

  ensureWhisper()
    .then(() => console.log("[worker] whisper ready"))
    .catch((e) => console.error("[worker] whisper setup failed:", e.message));

  let tick = 0;
  for (;;) {
    try {
      if (tick % REAP_EVERY_TICKS === 0) await reapStaleJobs();
      tick++;

      const job = await claimNextJob();
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      console.log(`[worker] rendering ${job.template} job ${job.id}`);
      const started = Date.now();
      try {
        await processJob(job);
        console.log(
          `[worker] done ${job.id} in ${Math.round((Date.now() - started) / 1000)}s`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] job ${job.id} failed:`, message);
        await failJob(job.id, message);
      }
    } catch (loopErr) {
      console.error("[worker] loop error:", loopErr);
      await sleep(POLL_MS * 2);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error("[worker] fatal:", e);
  process.exit(1);
});
