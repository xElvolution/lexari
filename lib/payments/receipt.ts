import { readFile } from "node:fs/promises";
import { putFile } from "@/lib/storage";
import { sha256Json } from "@/lib/hash";
import { TEMPLATES, type Job } from "@/lib/schemas";

/**
 * Tamper-evident work receipt, stored next to every rendered MP4.
 * Anyone can recompute inputHash from the canonical input JSON and
 * outputHash from the downloaded file, and check the payment tx on
 * the X Layer explorer.
 */
export interface Receipt {
  jobId: string;
  service: "lexari";
  template: string;
  createdAt: string;
  completedAt: string;
  inputHash: string;
  payment: Job["payment"];
  renderParams: {
    remotionVersion: string;
    compositionId: string;
    fps: number;
    durationInFrames: number;
    propsHash: string;
  };
  outputHash: string;
  outputBytes: number;
  demo: boolean;
}

export async function buildAndStoreReceipt(opts: {
  job: Job;
  outputHash: string;
  outputBytes: number;
  durationInFrames: number;
  props: unknown;
}): Promise<{ path: string; receipt: Receipt }> {
  const remotionVersion = await getRemotionVersion();
  const t = TEMPLATES[opts.job.template];
  const receipt: Receipt = {
    jobId: opts.job.id,
    service: "lexari",
    template: `${t.id}@${t.version}`,
    createdAt: opts.job.created_at,
    completedAt: new Date().toISOString(),
    inputHash: opts.job.input_hash,
    payment: opts.job.payment,
    renderParams: {
      remotionVersion,
      compositionId: t.compositionId,
      fps: 30,
      durationInFrames: opts.durationInFrames,
      propsHash: sha256Json(opts.props),
    },
    outputHash: opts.outputHash,
    outputBytes: opts.outputBytes,
    demo: opts.job.demo,
  };

  const path = `receipts/${opts.job.id}.json`;
  await putFile(path, JSON.stringify(receipt, null, 2));
  return { path, receipt };
}

let remotionVersionCache: string | null = null;
async function getRemotionVersion(): Promise<string> {
  if (remotionVersionCache) return remotionVersionCache;
  try {
    const pkg = JSON.parse(
      await readFile(
        new URL(await import.meta.resolve("remotion/package.json")),
        "utf8",
      ),
    );
    remotionVersionCache = pkg.version as string;
  } catch {
    remotionVersionCache = "4.x";
  }
  return remotionVersionCache;
}
