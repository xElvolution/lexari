import { withUser } from "@/server/route";
import { listIntegrations, revokeAll } from "@/server/integrations/grants";
import { logEvent } from "@/server/security";

export const runtime = "nodejs";

/** The kill switch: every integration off, every unconfirmed action cancelled. */
export const POST = withUser(async (user) => {
  const n = await revokeAll(user.userId);
  if (n) await logEvent(user, "integration", `Switched off every integration (${n})`);
  return Response.json({ ...(await listIntegrations(user.userId)), revoked: n });
});
