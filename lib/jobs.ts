import {
  RENDERS_BUCKET,
  RECEIPTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  supabase,
} from "./supabase";
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
  const { data, error } = await supabase()
    .from("jobs")
    .insert({
      template: opts.template,
      status: "queued",
      input: opts.input,
      input_hash: sha256Json(opts.input),
      payment: opts.payment,
      demo: opts.demo ?? false,
      progress: 0,
    })
    .select()
    .single();
  if (error) throw new Error(`createJob failed: ${error.message}`);
  return data as Job;
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase()
    .from("jobs")
    .select()
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getJob failed: ${error.message}`);
  return (data as Job) ?? null;
}

/**
 * Claim the oldest queued job. Paid jobs jump ahead of demo jobs.
 * Uses a SECURITY DEFINER Postgres function (FOR UPDATE SKIP LOCKED)
 * so concurrent workers never double-claim — see supabase/migration.sql.
 */
export async function claimNextJob(): Promise<Job | null> {
  const { data, error } = await supabase().rpc("claim_next_job");
  if (error) throw new Error(`claimNextJob failed: ${error.message}`);
  const rows = data as Job[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function updateProgress(id: string, progress: number) {
  await supabase()
    .from("jobs")
    .update({ progress: Math.round(progress) })
    .eq("id", id);
}

export async function completeJob(
  id: string,
  fields: {
    output_path: string;
    output_hash: string;
    receipt_path: string;
    payment?: PaymentRecord | null;
  },
) {
  const { error } = await supabase()
    .from("jobs")
    .update({
      status: "done",
      progress: 100,
      completed_at: new Date().toISOString(),
      ...fields,
    })
    .eq("id", id);
  if (error) throw new Error(`completeJob failed: ${error.message}`);
}

export async function failJob(id: string, message: string) {
  await supabase()
    .from("jobs")
    .update({
      status: "failed",
      error: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
}

/** Requeue jobs stuck in `rendering` (crashed worker). One retry, then failed. */
export async function reapStaleJobs() {
  const cutoff = new Date(
    Date.now() - STALE_RENDER_MINUTES * 60_000,
  ).toISOString();
  const { data } = await supabase()
    .from("jobs")
    .select("id, error")
    .eq("status", "rendering")
    .lt("started_at", cutoff);
  for (const row of data ?? []) {
    if (row.error === "requeued-after-stall") {
      await failJob(row.id, "render stalled twice");
    } else {
      await supabase()
        .from("jobs")
        .update({ status: "queued", error: "requeued-after-stall" })
        .eq("id", row.id);
    }
  }
}

export async function recentCompletedJobs(limit = 10): Promise<Job[]> {
  const { data } = await supabase()
    .from("jobs")
    .select()
    .eq("status", "done")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data as Job[]) ?? [];
}

export async function countDemoJobsToday(ip: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase()
    .from("demo_requests")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", dayStart.toISOString());
  return count ?? 0;
}

export async function recordDemoRequest(ip: string) {
  await supabase().from("demo_requests").insert({ ip });
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
    const sb = supabase();
    const [render, receipt] = await Promise.all([
      sb.storage
        .from(RENDERS_BUCKET)
        .createSignedUrl(job.output_path, SIGNED_URL_TTL_SECONDS),
      job.receipt_path
        ? sb.storage
            .from(RECEIPTS_BUCKET)
            .createSignedUrl(job.receipt_path, SIGNED_URL_TTL_SECONDS)
        : Promise.resolve({ data: null }),
    ]);
    if (render.data) pub.downloadUrl = render.data.signedUrl;
    if (receipt.data) pub.receiptUrl = receipt.data.signedUrl;
    if (job.output_hash) pub.outputHash = job.output_hash;
  }
  return pub;
}
