import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateBridgeRequest } from "@/lib/bridge-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/swarmleads/status
 * Report whether the caller's BounceBack account has the SwarmLeads $9.99
 * add-on active. SwarmLeads uses this to gate its upsell banner / features.
 */
export async function GET(req: Request) {
  const claims = authenticateBridgeRequest(req);
  if (!claims?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findUnique({
    where: { email: claims.sub.toLowerCase() },
    select: { swarmleadsAddonActive: true, swarmleadsAddonSince: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({
    addonActive: account.swarmleadsAddonActive,
    addonSince: account.swarmleadsAddonSince,
  });
}
