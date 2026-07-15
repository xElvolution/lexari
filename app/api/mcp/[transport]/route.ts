import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createJob, getJob, toPublic } from "@/lib/jobs";
import { payment } from "@/lib/payments/server";
import {
  AppTourInput,
  LaunchReelInput,
  StatClipInput,
  TEMPLATES,
  type TemplateId,
} from "@/lib/schemas";

/**
 * MCP surface (streamable HTTP, stateless): the agent-native way to call
 * Lexari. Payment modes:
 *  (a) OKX A2MCP gateway fronts pay-per-call and forwards the request after
 *      settlement (detected via forwarded payment headers), or
 *  (b) the tool responds with payment instructions pointing at the x402
 *      HTTP endpoints.
 * Exact gateway contract gets locked during ASP registration.
 */

const base = () => process.env.NEXT_PUBLIC_BASE_URL ?? "";

function paymentAuthorized(headers: Headers): boolean {
  if (process.env.PAYMENTS_DISABLED === "1" || !process.env.OKX_API_KEY) {
    return true;
  }
  // OKX A2MCP gateway attestation headers (exact names confirmed at registration).
  return Boolean(
    headers.get("x-payment") ??
      headers.get("x-okx-payment") ??
      headers.get("x-payment-settlement"),
  );
}

function paymentInstructions(template: TemplateId) {
  const t = TEMPLATES[template];
  return {
    error: "payment_required",
    message: `This tool costs ${t.priceUsd} in USDT0 on X Layer (eip155:196), paid via x402.`,
    how: `POST your input to ${base()}/api/v1/${template} with an x402 client (e.g. @okxweb3/x402-fetch). The first response is HTTP 402 with payment requirements; pay and retry to receive a jobId.`,
    validateFirst: `${base()}/api/v1/validate`,
  };
}

async function createRenderJob(
  template: TemplateId,
  input: unknown,
  headers: Headers,
) {
  const t = TEMPLATES[template];
  const parsed = t.schema.safeParse(input);
  if (!parsed.success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "validation_failed",
            issues: parsed.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          }),
        },
      ],
      isError: true,
    };
  }

  if (!paymentAuthorized(headers)) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(paymentInstructions(template)),
        },
      ],
      isError: true,
    };
  }

  const job = await createJob({
    template,
    input: parsed.data,
    payment: payment(template),
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          jobId: job.id,
          status: job.status,
          estimatedSeconds: t.estimatedRenderSec,
          next: `Call get_job with this jobId every 10-15s until status is "done", then download the MP4 from downloadUrl.`,
        }),
      },
    ],
  };
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "create_launch_reel",
      `Render a cinematic ≤40s product launch video (1080p MP4) from structured input: product name, one-liner, three feature bullets, optional logo, brand color, and 1-3 screenshot URLs. Includes narrated voiceover and word-synced captions. Price: ${TEMPLATES["launch-reel"].priceUsd} per render (x402, USDT0 on X Layer). Returns a jobId — poll with get_job.`,
      LaunchReelInput.shape,
      async (args, extra) =>
        createRenderJob(
          "launch-reel",
          args,
          (extra as { requestInfo?: { headers?: Headers } })?.requestInfo
            ?.headers ?? new Headers(),
        ),
    );

    server.tool(
      "create_stat_clip",
      `Render a 10-20s animated data-highlight video (1080p MP4) from a title and 2-6 stats (label, value, optional unit and delta). Optional narration. Price: ${TEMPLATES["stat-clip"].priceUsd} per render (x402, USDT0 on X Layer). Returns a jobId — poll with get_job.`,
      StatClipInput.shape,
      async (args, extra) =>
        createRenderJob(
          "stat-clip",
          args,
          (extra as { requestInfo?: { headers?: Headers } })?.requestInfo
            ?.headers ?? new Headers(),
        ),
    );

    server.tool(
      "create_app_tour",
      `Record a real screen-capture walkthrough of a live web app and wrap it in a branded intro/outro with narration and captions. Input: product URL, ordered steps (goto/click/scroll/type/hover/wait, each with a caption), product name, brand color. An animated cursor performs each step. Price: ${TEMPLATES["app-tour"].priceUsd} per render (x402, USDT0 on X Layer). Returns a jobId — poll with get_job.`,
      AppTourInput.shape,
      async (args, extra) =>
        createRenderJob(
          "app-tour",
          args,
          (extra as { requestInfo?: { headers?: Headers } })?.requestInfo
            ?.headers ?? new Headers(),
        ),
    );

    server.tool(
      "get_job",
      "Get the status of a render job. When status is 'done' the response includes a signed downloadUrl for the MP4 and a receiptUrl with the verifiable work receipt (input hash, payment tx, output hash).",
      { jobId: z.string().uuid() },
      async ({ jobId }) => {
        const job = await getJob(jobId);
        if (!job) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ error: "job not found" }) },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(await toPublic(job)) },
          ],
        };
      },
    );
  },
  {
    serverInfo: { name: "lexari", version: "0.1.0" },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
