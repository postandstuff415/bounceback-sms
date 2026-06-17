import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        businessName: true,
        realPhoneNumber: true,
        assignedTwilioNum: true,
        bookingLink: true,
        subscriptionStatus: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "No account found with this email. Please onboard first." }, { status: 404 });
    }

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    console.error("Login verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
