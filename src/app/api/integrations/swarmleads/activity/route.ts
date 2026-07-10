import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { authenticateBridgeRequest } from "@/lib/bridge-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/swarmleads/activity
 * Recent BounceBack call/SMS activity for the caller's account, so SwarmLeads
 * can show a real activity panel (replacing its local simulation).
 */
export async function GET(req: Request) {
  const claims = authenticateBridgeRequest(req);
  if (!claims?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findUnique({
    where: { email: claims.sub.toLowerCase() },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const logs = await prisma.callLog.findMany({
    where: { accountId: account.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const activity = logs.map((log) => ({
    id: log.id,
    // callerNumber is AES-256-GCM encrypted at rest; decrypt for display.
    callerNumber: log.callerNumber ? decrypt(log.callerNumber) : null,
    callStatus: log.callStatus,
    smsSent: log.smsSent,
    timestamp: log.timestamp.toISOString(),
  }));

  return NextResponse.json({ activity });
}
