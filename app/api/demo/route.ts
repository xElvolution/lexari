import { NextResponse, type NextRequest } from "next/server";
import {
  countDemoJobsToday,
  createJob,
  recordDemoRequest,
} from "@/lib/jobs";
import { LaunchReelInput, StatClipInput, type TemplateId } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = 3;

// Templates a human can render free (watermarked). App Tour is paid-only
// (it drives a real browser — too heavy for an anonymous free tier).
const DEMO_SCHEMAS = {
  "launch-reel": LaunchReelInput,
  "stat-clip": StatClipInput,
} as const;

/**
 * Free watermarked render — the zero-setup human path from the Create studio.
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
        message: `Free demos are limited to ${DAILY_LIMIT} per day. Connect a wallet to render unlimited clean 1080p videos — from $2 per render via x402.`,
      },
      { status: 429 },
    );
  }

  let body: { template?: string; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const template = body.template as keyof typeof DEMO_SCHEMAS;
  const schema = DEMO_SCHEMAS[template];
  if (!schema) {
    return NextResponse.json(
      { error: "free demo supports launch-reel and stat-clip only" },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(body.input);
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
    template: template as TemplateId,
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
