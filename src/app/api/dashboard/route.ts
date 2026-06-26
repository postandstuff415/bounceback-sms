import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Authenticate the request
    const session = await authenticateRequest(req);
    
    let email: string | null = null;
    
    if (session) {
      // Authenticated user - use their session email
      email = session.email;
    } else {
      // For backward compatibility during transition, check query param
      // In production, this should be removed and only session-based auth used
      const { searchParams } = new URL(req.url);
      email = searchParams.get("email");
      
      if (!email) {
        return NextResponse.json({ 
          error: "Authentication required. Please provide a valid session token." 
        }, { status: 401 });
      }
    }

    const account = await prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        logs: {
          orderBy: {
            timestamp: "desc",
          },
        },
        intakeTickets: {
          include: {
            activities: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
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
    const recoveryRate = totalLogs > 0 ? Math.round((rescuedLogs / totalLogs) * 100) : 100;
    const totalRevenueSaved = account.logs.reduce((acc, log) => acc + log.revenueSavedEst, 0);

    // Decrypt sensitive fields for display
    const decryptedLogs = account.logs.map((log) => ({
      ...log,
      callerNumber: decrypt(log.callerNumber),
    }));

    const decryptedLeads = account.intakeTickets.map((ticket) => ({
      ...ticket,
      customerPhone: decrypt(ticket.customerPhone),
    }));

    // Fetch parent agency or self white-label details
    let whiteLabel = null;
    if (account.agencyId) {
      const agency = await prisma.account.findUnique({
        where: { id: account.agencyId },
        select: {
          customLogoUrl: true,
          customBrandColor: true,
          businessName: true,
        },
      });
      if (agency && (agency.customLogoUrl || agency.customBrandColor)) {
        whiteLabel = {
          logoUrl: agency.customLogoUrl,
          brandColor: agency.customBrandColor,
          agencyName: agency.businessName,
        };
      }
    } else if (account.role === "AGENCY") {
      if (account.customLogoUrl || account.customBrandColor) {
        whiteLabel = {
          logoUrl: account.customLogoUrl,
          brandColor: account.customBrandColor,
          agencyName: account.businessName,
        };
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        businessName: account.businessName,
        email: account.email,
        realPhoneNumber: decrypt(account.realPhoneNumber),
        assignedTwilioNum: account.assignedTwilioNum,
        bookingLink: account.bookingLink,
        subscriptionStatus: account.subscriptionStatus,
        role: account.role,
      },
      metrics: {
        recoveryRate,
        totalRevenueSaved,
        leadsRescued: rescuedLogs,
        missedCalls: totalLogs,
      },
      logs: decryptedLogs,
      leads: decryptedLeads,
      whiteLabel,
    });
  } catch (error: any) {
    console.error("Dashboard data fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
