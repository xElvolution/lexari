import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { absolutePath, verifySignature } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".json": "application/json",
};

/** Serves rendered MP4s and receipts via HMAC-signed, expiring URLs. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relPath = segments.join("/");
  const exp = Number(req.nextUrl.searchParams.get("exp"));
  const sig = req.nextUrl.searchParams.get("sig") ?? "";

  if (!verifySignature(relPath, exp, sig)) {
    return NextResponse.json(
      { error: "invalid or expired link" },
      { status: 403 },
    );
  }

  let abs: string;
  try {
    abs = absolutePath(relPath);
  } catch {
    return NextResponse.json({ error: "bad path" }, { status: 400 });
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = relPath.slice(relPath.lastIndexOf("."));
  const stream = Readable.toWeb(
    createReadStream(abs),
  ) as unknown as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "content-type": MIME[ext] ?? "application/octet-stream",
      "content-length": String(statSync(abs).size),
      "cache-control": "private, max-age=3600",
    },
  });
}
