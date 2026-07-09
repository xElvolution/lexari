"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { JobPublic } from "@/lib/schemas";
import { EXPLORER_TX } from "@/components/landing/ReceiptsFeed";

const POLL_MS = 5000;

/** Live job page: progress while rendering, player + receipt when done. */
export default function JobView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobPublic | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/v1/jobs/${jobId}`, { cache: "no-store" });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data: JobPublic = await res.json();
        if (stop) return;
        setJob(data);
        if (data.status === "queued" || data.status === "rendering") {
          setTimeout(poll, POLL_MS);
        }
      } catch {
        if (!stop) setTimeout(poll, POLL_MS * 2);
      }
    }
    poll();
    return () => {
      stop = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (job?.receiptUrl && !receipt) {
      fetch(job.receiptUrl)
        .then((r) => r.json())
        .then(setReceipt)
        .catch(() => {});
    }
  }, [job?.receiptUrl, receipt]);

  if (notFound) {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-bold">Job not found</h1>
        <Link href="/" className="mt-4 inline-block text-[#8B7CFF] hover:underline">
          ← back to RenderReel
        </Link>
      </Shell>
    );
  }

  if (!job) {
    return (
      <Shell>
        <div className="animate-pulse text-zinc-500">loading job…</div>
      </Shell>
    );
  }

  const txHash =
    receipt && typeof receipt.payment === "object" && receipt.payment
      ? ((receipt.payment as Record<string, unknown>).txHash as string | null)
      : null;

  return (
    <Shell>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#8B7CFF]">
        {job.template} · job {job.jobId.slice(0, 8)}
      </div>

      {job.status === "done" && job.downloadUrl ? (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-bold">Your film is ready.</h1>
          <video
            src={job.downloadUrl}
            controls
            autoPlay
            muted
            playsInline
            className="mt-8 w-full rounded-2xl border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
          />
          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href={job.downloadUrl}
              download
              className="rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#4ADEDE] px-6 py-3 font-semibold text-black"
            >
              Download MP4
            </a>
            {job.receiptUrl && (
              <a
                href={job.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-zinc-200 hover:bg-white/5"
              >
                View receipt JSON
              </a>
            )}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-display text-xl font-semibold">Verify this work</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-400">
              <li>
                <code className="text-[#4ADEDE]">sha256</code> the downloaded MP4 — it must equal{" "}
                <code className="break-all text-[#4ADEDE]">{job.outputHash}</code>
              </li>
              <li>The receipt&apos;s inputHash is the sha256 of the canonical input JSON.</li>
              <li>
                {txHash ? (
                  <>
                    The payment settled on X Layer:{" "}
                    <a
                      href={`${EXPLORER_TX}${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4ADEDE] hover:underline"
                    >
                      {txHash.slice(0, 14)}…
                    </a>
                  </>
                ) : (
                  "Free demo render — no payment transaction."
                )}
              </li>
            </ol>
          </div>
        </motion.div>
      ) : job.status === "failed" ? (
        <div>
          <h1 className="font-display text-4xl font-bold text-red-300">Render failed</h1>
          <p className="mt-4 text-zinc-400">{job.error ?? "unknown error"}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Paid jobs that fail are refunded manually — contact us with this job id.
          </p>
        </div>
      ) : (
        <div>
          <h1 className="font-display text-4xl font-bold">
            {job.status === "queued" ? "In the queue…" : "Rendering your film…"}
          </h1>
          <div className="mt-8 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#4ADEDE]"
              animate={{ width: `${Math.max(job.progress, 3)}%` }}
              transition={{ ease: "easeOut", duration: 0.6 }}
            />
          </div>
          <div className="mt-3 flex justify-between text-sm text-zinc-500">
            <span>{job.progress}%</span>
            <span>~{job.estimatedSeconds}s typical</span>
          </div>
          <p className="mt-8 text-sm leading-relaxed text-zinc-500">
            Script → voiceover → word-level caption timing → 1080p motion-graphics render.
            This page updates automatically.
          </p>
        </div>
      )}

      <Link href="/" className="mt-12 inline-block text-sm text-zinc-500 hover:text-zinc-300">
        ← RenderReel home
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-24">
      {children}
    </main>
  );
}
