import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { authenticateBridgeRequest } from "@/lib/bridge-auth";
import { sanitizePhone } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

interface IncomingLead {
  phone?: string;
  businessName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * POST /api/integrations/swarmleads/leads
 * Accept a batch of phone leads pushed from SwarmLeads' outreach queue and
 * enqueue them (status QUEUED) against the caller's BounceBack account. Actual
 * SMS dispatch reuses the existing Twilio path and is Phase 3.
 */
export async function POST(req: Request) {
  const claims = authenticateBridgeRequest(req);
  if (!claims?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findUnique({
    where: { email: claims.sub.toLowerCase() },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let body: { leads?: IncomingLead[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!Array.isArray(body.leads) || body.leads.length === 0) {
    return NextResponse.json({ error: "`leads` must be a non-empty array" }, { status: 400 });
  }

  // Validate + normalize before persisting; skip rows without a usable phone.
  const rows = body.leads
    .map((lead) => {
      const phone = lead.phone ? sanitizePhone(lead.phone) : null;
      if (!phone) return null;
      return {
        accountId: account.id,
        phone: encrypt(phone), // AES-256-GCM at the application layer
        businessName: lead.businessName?.slice(0, 200) ?? null,
        metadata: (lead.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No leads had a valid phone number" }, { status: 400 });
  }

  await prisma.swarmleadsOutreach.createMany({ data: rows });

  return NextResponse.json({ queued: rows.length });
}
