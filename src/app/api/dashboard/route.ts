import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        logs: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Calculate metrics
    const totalLogs = account.logs.length;
    const rescuedLogs = account.logs.filter((log) => log.smsSent).length;
    
    // Recovery rate is % of logs that had an SMS sent
    const recoveryRate = totalLogs > 0 ? Math.round((rescuedLogs / totalLogs) * 100) : 100;
    
    // Total Revenue Saved
    const totalRevenueSaved = account.logs.reduce((acc, log) => acc + log.revenueSavedEst, 0);

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        businessName: account.businessName,
        email: account.email,
        realPhoneNumber: account.realPhoneNumber,
        assignedTwilioNum: account.assignedTwilioNum,
        bookingLink: account.bookingLink,
        subscriptionStatus: account.subscriptionStatus,
      },
      metrics: {
        recoveryRate,
        totalRevenueSaved,
        leadsRescued: rescuedLogs,
        missedCalls: totalLogs,
      },
      logs: account.logs,
    });
  } catch (error: any) {
    console.error("Dashboard data fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
