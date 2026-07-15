import { NextResponse, type NextRequest } from "next/server";
import { createJob } from "@/lib/jobs";
import { currentUser } from "@/lib/auth";
import { TEMPLATES, type TemplateId } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated render: signed-in users render clean 1080p (no watermark).
 * The heavy x402 on-chain payment path stays on /api/v1/* for agents; here,
 * a logged-in human's render is queued directly. App Tour is included.
 * Body: { template, input }
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "sign in to render clean 1080p", requiresAuth: true },
      { status: 401 },
    );
  }

  let body: { template?: string; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const template = body.template as TemplateId;
  const t = TEMPLATES[template];
  if (!t) {
    return NextResponse.json(
      { error: `template must be one of: ${Object.keys(TEMPLATES).join(", ")}` },
      { status: 400 },
    );
  }

  const parsed = t.schema.safeParse(body.input);
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

  const job = await createJob({
    template,
    input: parsed.data,
    payment: null,
    demo: false, // clean 1080p, no watermark
    userId: user.id,
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      statusUrl: `${base}/api/v1/jobs/${job.id}`,
      estimatedSeconds: t.estimatedRenderSec,
    },
    { status: 202 },
  );
}
