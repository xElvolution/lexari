import { db } from "./db";
import { signedUrl } from "./storage";
import { sha256Json } from "./hash";
import {
  TEMPLATES,
  type Job,
  type JobPublic,
  type PaymentRecord,
  type TemplateId,
} from "./schemas";

const STALE_RENDER_MINUTES = 15;

export async function createJob(opts: {
  template: TemplateId;
  input: unknown;
  payment: PaymentRecord | null;
  demo?: boolean;
}): Promise<Job> {
  const { rows } = await db().query(
    `insert into jobs (template, status, input, input_hash, payment, demo, progress)
     values ($1, 'queued', $2, $3, $4, $5, 0)
     returning *`,
    [
      opts.template,
      JSON.stringify(opts.input),
      sha256Json(opts.input),
      opts.payment ? JSON.stringify(opts.payment) : null,
      opts.demo ?? false,
    ],
  );
  return rows[0] as Job;
}

export async function getJob(id: string): Promise<Job | null> {
  const { rows } = await db().query(`select * from jobs where id = $1`, [id]);
  return (rows[0] as Job) ?? null;
}

/**
 * Atomically claim the oldest queued job (paid before demo) —
 * FOR UPDATE SKIP LOCKED means concurrent workers never double-claim.
 */
export async function claimNextJob(): Promise<Job | null> {
  const { rows } = await db().query(
    `update jobs set status = 'rendering', started_at = now()
     where id = (
       select id from jobs where status = 'queued'
       order by demo asc, created_at asc
       limit 1
       for update skip locked
     )
     returning *`,
  );
  return (rows[0] as Job) ?? null;
}

export async function updateProgress(id: string, progress: number) {
  await db().query(`update jobs set progress = $2 where id = $1`, [
    id,
    Math.round(progress),
  ]);
}

export async function completeJob(
  id: string,
  fields: {
    output_path: string;
    output_hash: string;
    receipt_path: string;
  },
) {
  await db().query(
    `update jobs set status = 'done', progress = 100, completed_at = now(),
       output_path = $2, output_hash = $3, receipt_path = $4
     where id = $1`,
    [id, fields.output_path, fields.output_hash, fields.receipt_path],
  );
}

export async function failJob(id: string, message: string) {
  await db().query(
    `update jobs set status = 'failed', error = $2, completed_at = now()
     where id = $1`,
    [id, message.slice(0, 1000)],
  );
}

/** Requeue jobs stuck in `rendering` (crashed worker). One retry, then failed. */
export async function reapStaleJobs() {
  const { rows } = await db().query(
    `select id, error from jobs
     where status = 'rendering' and started_at < now() - interval '${STALE_RENDER_MINUTES} minutes'`,
  );
  for (const row of rows) {
    if (row.error === "requeued-after-stall") {
      await failJob(row.id, "render stalled twice");
    } else {
      await db().query(
        `update jobs set status = 'queued', error = 'requeued-after-stall' where id = $1`,
        [row.id],
      );
    }
  }
}

export async function recentCompletedJobs(limit = 10): Promise<Job[]> {
  const { rows } = await db().query(
    `select * from jobs where status = 'done'
     order by completed_at desc limit $1`,
    [limit],
  );
  return rows as Job[];
}

export async function countDemoJobsToday(ip: string): Promise<number> {
  const { rows } = await db().query(
    `select count(*)::int as n from demo_requests
     where ip = $1 and created_at >= date_trunc('day', now() at time zone 'utc')`,
    [ip],
  );
  return rows[0]?.n ?? 0;
}

export async function recordDemoRequest(ip: string) {
  await db().query(`insert into demo_requests (ip) values ($1)`, [ip]);
}

export async function toPublic(job: Job): Promise<JobPublic> {
  const pub: JobPublic = {
    jobId: job.id,
    template: job.template,
    status: job.status,
    progress: job.progress,
    createdAt: job.created_at,
    completedAt: job.completed_at,
    estimatedSeconds: TEMPLATES[job.template].estimatedRenderSec,
  };
  if (job.status === "failed" && job.error) pub.error = job.error;
  if (job.status === "done" && job.output_path) {
    pub.downloadUrl = signedUrl(job.output_path);
    if (job.receipt_path) pub.receiptUrl = signedUrl(job.receipt_path);
    if (job.output_hash) pub.outputHash = job.output_hash;
  }
  return pub;
}
