import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const agency = await prisma.account.findUnique({
      where: { email: session.email.trim().toLowerCase() },
    });

    if (!agency || (agency.role !== "AGENCY" && agency.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Access denied." }, { status: 403 });
    }

    // Handle SUPERADMIN (Michael@bounceback-sms.com) View
    if (agency.role === "SUPERADMIN") {
      const allAccounts = await prisma.account.findMany({
        orderBy: { createdAt: "desc" },
      });

      const allLogs = await prisma.callLog.findMany({
        include: {
          account: {
            select: {
              businessName: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
      });

      const decryptedLogs = allLogs.map((log) => ({
        id: log.id,
        accountId: log.accountId,
        businessName: log.account?.businessName || "Unknown",
        callerNumber: decrypt(log.callerNumber),
        callStatus: log.callStatus,
        smsSent: log.smsSent,
        revenueSavedEst: log.revenueSavedEst,
        timestamp: log.timestamp,
      }));

      const formattedBusinesses = allAccounts.map((acc) => ({
        id: acc.id,
        email: acc.email,
        businessName: acc.businessName,
        assignedTwilioNum: acc.assignedTwilioNum,
        bookingLink: acc.bookingLink,
        role: acc.role,
        subscriptionStatus: acc.subscriptionStatus,
        smsTemplate: acc.smsTemplate,
        createdAt: acc.createdAt,
      }));

      return NextResponse.json({
        success: true,
        role: "SUPERADMIN",
        businesses: formattedBusinesses,
        logs: decryptedLogs,
      });
    }

    // Handle standard AGENCY View
    const subAccounts = await prisma.account.findMany({
      where: { agencyId: agency.id },
      include: {
        logs: true,
        intakeTickets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedSubAccounts = subAccounts.map((sub) => {
      const totalLogs = sub.logs.length;
      const rescuedLogs = sub.logs.filter((log) => log.smsSent).length;
      const recoveryRate = totalLogs > 0 ? Math.round((rescuedLogs / totalLogs) * 100) : 100;
      const totalRevenueSaved = sub.logs.reduce((acc, log) => acc + log.revenueSavedEst, 0);

      return {
        id: sub.id,
        email: sub.email,
        businessName: sub.businessName,
        realPhoneNumber: decrypt(sub.realPhoneNumber),
        assignedTwilioNum: sub.assignedTwilioNum,
        bookingLink: sub.bookingLink,
        subscriptionStatus: sub.subscriptionStatus,
        aiFrontDeskEnabled: sub.aiFrontDeskEnabled,
        createdAt: sub.createdAt,
        metrics: {
          recoveryRate,
          totalRevenueSaved,
          leadsRescued: rescuedLogs,
          missedCalls: totalLogs,
        },
      };
    });

    const totalMissedCalls = subAccounts.reduce((acc, sub) => acc + sub.logs.length, 0);
    const totalLeadsRescued = subAccounts.reduce(
      (acc, sub) => acc + sub.logs.filter((log) => log.smsSent).length,
      0
    );
    const aggregatedRecoveryRate =
      totalMissedCalls > 0 ? Math.round((totalLeadsRescued / totalMissedCalls) * 100) : 100;
    const totalRevenueSaved = subAccounts.reduce(
      (acc, sub) => acc + sub.logs.reduce((sum, log) => sum + log.revenueSavedEst, 0),
      0
    );

    return NextResponse.json({
      success: true,
      role: "AGENCY",
      agency: {
        id: agency.id,
        businessName: agency.businessName,
        email: agency.email,
        customLogoUrl: agency.customLogoUrl,
        customBrandColor: agency.customBrandColor,
      },
      subAccounts: formattedSubAccounts,
      metrics: {
        recoveryRate: aggregatedRecoveryRate,
        totalRevenueSaved,
        leadsRescued: totalLeadsRescued,
        missedCalls: totalMissedCalls,
      },
    });
  } catch (error: any) {
    console.error("Dashboard fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
