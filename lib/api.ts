import { NextResponse, type NextRequest } from "next/server";
import { createJob, toPublic } from "@/lib/jobs";
import { payment, withPayment } from "@/lib/payments/server";
import { TEMPLATES, type TemplateId } from "@/lib/schemas";

/** Shared handler factory for the two paid template routes. */
export function paidTemplateRoute(templateId: TemplateId) {
  const t = TEMPLATES[templateId];

  const handler = async (req: NextRequest): Promise<NextResponse> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = t.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
          hint: "POST the same body to /api/v1/validate (free) before paying.",
        },
        { status: 400 },
      );
    }

    const job = await createJob({
      template: templateId,
      input: parsed.data,
      payment: payment(templateId),
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        statusUrl: `${base}/api/v1/jobs/${job.id}`,
        estimatedSeconds: t.estimatedRenderSec,
        poll: "GET the statusUrl every 10-15s until status is done or failed",
      },
      { status: 202 },
    );
  };

  return withPayment(templateId, handler);
}

export async function jobStatusResponse(id: string) {
  const { getJob } = await import("@/lib/jobs");
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }
  return NextResponse.json(await toPublic(job));
}
