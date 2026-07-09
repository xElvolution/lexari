import { recentCompletedJobs } from "@/lib/jobs";
import { SectionTitle } from "./Reveal";

export const EXPLORER_TX = "https://web3.okx.com/explorer/x-layer/tx/";

/**
 * Server component: last 10 completed renders with their payment tx —
 * live, checkable proof that real work is being bought.
 */
export default async function ReceiptsFeed() {
  let jobs: Awaited<ReturnType<typeof recentCompletedJobs>> = [];
  try {
    jobs = await recentCompletedJobs(10);
  } catch {
    // Supabase not configured yet — render the empty state.
  }

  return (
    <section id="receipts" className="relative mx-auto max-w-4xl px-6 py-32">
      <SectionTitle
        kicker="Proof of work"
        title="Every render leaves a receipt"
        sub="Input hash, payment transaction, output hash — recompute them yourself. This feed is the live production log."
      />
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-6 py-4">Template</th>
              <th className="px-6 py-4">Completed</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Output hash</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-600">
                  Renders will appear here the moment the first job completes.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${job.template === "launch-reel" ? "bg-[#6C5CE7]/20 text-[#8B7CFF]" : "bg-[#4ADEDE]/15 text-[#4ADEDE]"}`}>
                    {job.demo ? "demo" : job.template}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {job.completed_at ? new Date(job.completed_at).toUTCString().replace(" GMT", " UTC") : "—"}
                </td>
                <td className="px-6 py-4">
                  {job.payment?.txHash ? (
                    <a
                      href={`${EXPLORER_TX}${job.payment.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#4ADEDE] hover:underline"
                    >
                      {job.payment.txHash.slice(0, 10)}…
                    </a>
                  ) : (
                    <span className="text-zinc-600">{job.demo ? "free demo" : "—"}</span>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                  {job.output_hash ? `${job.output_hash.slice(0, 18)}…` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
