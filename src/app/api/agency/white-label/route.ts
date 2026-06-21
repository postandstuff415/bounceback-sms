import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const agency = await prisma.account.findUnique({
      where: { email: session.email.trim().toLowerCase() },
    });

    if (!agency || agency.role !== "AGENCY") {
      return NextResponse.json({ error: "Unauthorized. Agency access only." }, { status: 403 });
    }

    const body = await req.json();
    const { customLogoUrl, customBrandColor } = body;

    // Optional but good: Basic hex color validation if provided
    if (customBrandColor && !/^#[0-9A-Fa-f]{6}$/.test(customBrandColor)) {
      return NextResponse.json(
        { error: "Invalid brand color. Must be a 6-character hex string (e.g., #10B981)." },
        { status: 400 }
      );
    }

    const updatedAgency = await prisma.account.update({
      where: { id: agency.id },
      data: {
        customLogoUrl: customLogoUrl ? customLogoUrl.trim() : null,
        customBrandColor: customBrandColor ? customBrandColor.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "White-label configuration updated successfully.",
      whiteLabel: {
        customLogoUrl: updatedAgency.customLogoUrl,
        customBrandColor: updatedAgency.customBrandColor,
      },
    });
  } catch (error: any) {
    console.error("White-label settings update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
