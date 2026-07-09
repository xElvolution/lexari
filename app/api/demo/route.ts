import { NextResponse, type NextRequest } from "next/server";
import {
  countDemoJobsToday,
  createJob,
  recordDemoRequest,
} from "@/lib/jobs";
import { LaunchReelInput } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = 2;

/**
 * Free watermarked 720p Launch Reel — the zero-setup judge/user path.
 * Rate limited per IP per UTC day; demo jobs queue behind paid jobs.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const used = await countDemoJobsToday(ip);
  if (used >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: "demo limit reached",
        message: `Free demos are limited to ${DAILY_LIMIT} per day. For unlimited renders, call the paid API — $5 per launch reel via x402.`,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = LaunchReelInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  await recordDemoRequest(ip);
  const job = await createJob({
    template: "launch-reel",
    input: parsed.data,
    payment: null,
    demo: true,
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      statusUrl: `${base}/api/v1/jobs/${job.id}`,
      note: "Demo render: 720p with watermark. Paid renders are clean 1080p.",
    },
    { status: 202 },
  );
}
