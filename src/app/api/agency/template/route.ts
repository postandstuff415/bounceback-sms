import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = await prisma.account.findUnique({
      where: { email: session.email.trim().toLowerCase() },
    });

    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized. Superadmin access only." }, { status: 403 });
    }

    const body = await req.json();
    const { accountId, smsTemplate } = body;

    if (!accountId) {
      return NextResponse.json({ error: "Missing account ID." }, { status: 400 });
    }

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        smsTemplate: smsTemplate ? smsTemplate.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "SMS Template configured successfully.",
      account: {
        id: updatedAccount.id,
        businessName: updatedAccount.businessName,
        smsTemplate: updatedAccount.smsTemplate,
      },
    });
  } catch (error: any) {
    console.error("SMS Template update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
