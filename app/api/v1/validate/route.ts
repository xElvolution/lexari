import { NextResponse, type NextRequest } from "next/server";
import { TEMPLATES, type TemplateId } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Free dry-run validation. Agents call this before paying so an invalid
 * input never costs money. Body: { template: "launch-reel"|"stat-clip", input: {...} }
 */
export async function POST(req: NextRequest) {
  let body: { template?: string; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, error: "invalid JSON" }, { status: 400 });
  }

  const template = body.template as TemplateId;
  if (!template || !(template in TEMPLATES)) {
    return NextResponse.json(
      { valid: false, error: `template must be one of: ${Object.keys(TEMPLATES).join(", ")}` },
      { status: 400 },
    );
  }

  const parsed = TEMPLATES[template].schema.safeParse(body.input);
  if (!parsed.success) {
    return NextResponse.json({
      valid: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }
  return NextResponse.json({
    valid: true,
    price: TEMPLATES[template].priceUsd,
    estimatedSeconds: TEMPLATES[template].estimatedRenderSec,
  });
}
