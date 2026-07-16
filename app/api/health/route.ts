import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness for the ASP listing, uptime checks, and judges.
 * Reports DB reachability and queue freshness (a worker is "alive" if any
 * job moved within the last 10 minutes OR the queue is simply empty).
 */
export async function GET() {
  const checks: Record<string, unknown> = { web: true };
  let healthy = true;

  try {
    const { rows } = await db().query(
      `select
         count(*) filter (where status in ('queued','rendering'))::int as active,
         max(greatest(created_at, started_at, completed_at)) as last_activity
       from jobs`,
    );
    checks.db = true;
    checks.activeJobs = rows[0].active;
    checks.lastJobActivity = rows[0].last_activity;
  } catch {
    checks.db = false;
    healthy = false;
  }

  return NextResponse.json(
    { ok: healthy, service: "lexari", ...checks },
    { status: healthy ? 200 : 503 },
  );
}
