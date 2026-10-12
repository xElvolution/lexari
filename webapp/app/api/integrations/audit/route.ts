import { jsonError, noStore } from "@/server/http";
import { withUser } from "@/server/route";
import { auditOf } from "@/server/integrations/grants";
import { integrationById } from "@/content/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => { const t = v === undefined || v === null ? "" : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** The integration audit log: grant changes and every agent call. ?connector= narrows it, ?format=csv downloads it. */
export const GET = withUser(async (user, req) => {
  const q = new URL(req.url).searchParams;
  const connector = q.get("connector") || undefined;
  if (connector && !integrationById(connector)) return jsonError(400, "There's no integration with that name.");
  const before = Number(q.get("before")) || undefined;
  const csv = q.get("format") === "csv";
  const rows = await auditOf(user.userId, { connector, before, limit: csv ? 200 : Number(q.get("limit")) || 60 });
  if (!csv) return Response.json({ rows }, { headers: noStore });
  const lines = [["time_utc", "integration", "kind", "title", "agent", "usd", "detail", "explorer"].join(",")]
    .concat(rows.map((r) => [new Date(r.at).toISOString(), integrationById(r.connector)?.name || r.connector, r.kind, r.title, r.agent, r.usd?.toFixed(2), r.detail, r.explorer].map(csvCell).join(",")));
  return new Response(lines.join("\n") + "\n", { headers: { ...noStore, "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="lexari-integrations-audit.csv"` } });
});
