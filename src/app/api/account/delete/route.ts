import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GDPR Data Deletion Endpoint (Right to Erasure / Right to be Forgotten)
 * 
 * POST /api/account/delete
 * Authorization: Bearer <token>
 * 
 * Deletes the authenticated user's account and all associated data.
 * Billing records are anonymized (not completely deleted) for tax compliance.
 */
export async function POST(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { email, accountId } = session;

    // Verify the account exists
    const account = await prisma.account.findUnique({
      where: { email },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Verify the session belongs to this account
    if (account.id !== accountId) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
    }

    // Delete all associated data in the right order
    // 1. Delete intake tickets
    await prisma.intakeTicket.deleteMany({
      where: { accountId: account.id },
    });

    // 2. Delete call logs
    await prisma.callLog.deleteMany({
      where: { accountId: account.id },
    });

    // 3. Anonymize account record (keep minimal billing data for tax compliance)
    // Replace all PII with anonymized markers
    await prisma.account.update({
      where: { id: account.id },
      data: {
        businessName: "[DELETED]",
        email: `deleted-${account.id}@bounceback-sms.com`,
        realPhoneNumber: "[DELETED]",
        bookingLink: "[DELETED]",
        assignedTwilioNum: null,
        privacyAccepted: false,
        privacyAcceptedAt: null,
        privacyPolicyVersion: null,
        termsAccepted: false,
        termsAcceptedAt: null,
        termsVersion: null,
        subscriptionStatus: "deleted",
      },
    });

    console.log(`[GDPR Deletion] Account ${email} (ID: ${account.id}) anonymized successfully.`);

    return NextResponse.json({
      success: true,
      message: "Your account and all associated data have been deleted in accordance with GDPR Article 17 (Right to Erasure). Minimal billing records have been anonymized for tax compliance.",
    });
  } catch (error: any) {
    console.error("[GDPR Deletion Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/account/data - Export all personal data (Right to Access / Data Portability)
 */
export async function GET(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { email } = session;

    const account = await prisma.account.findUnique({
      where: { email },
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
        },
        intakeTickets: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Return all data in structured JSON format for portability
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      gdprCompliant: true,
      data: {
        account: {
          id: account.id,
          email: account.email,
          businessName: account.businessName,
          subscriptionStatus: account.subscriptionStatus,
          privacyAccepted: account.privacyAccepted,
          privacyAcceptedAt: account.privacyAcceptedAt,
          privacyPolicyVersion: account.privacyPolicyVersion,
          termsAccepted: account.termsAccepted,
          termsAcceptedAt: account.termsAcceptedAt,
          termsVersion: account.termsVersion,
          createdAt: account.createdAt,
        },
        callLogs: account.logs,
        intakeTickets: account.intakeTickets,
      },
    });
  } catch (error: any) {
    console.error("[GDPR Data Export Error]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
